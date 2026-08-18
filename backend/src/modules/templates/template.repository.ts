import { prisma } from "../../lib/prisma.js";
import { templateContentSchema } from "./template-content.schema.js";
import type { ClinicalGoal, TemplateContent } from "./template.types.js";

export interface ActiveTemplateVersion {
  id: string;
  templateId: string;
  slug: string;
  clinicalGoal: ClinicalGoal;
  title: string;
  version: number;
  content: TemplateContent;
  approvedBy: string;
  approvedAt: Date;
}

/**
 * Devolve a versão ativa e aprovada para um objetivo clínico, ou null se não
 * existir nenhuma (secção 1: "não têm template disponível... a app não
 * inventa um na hora — recusa a sessão de forma clara"). Nunca devolve uma
 * versão DRAFT ou RETIRED.
 */
export async function findActiveApprovedVersionForGoal(
  clinicalGoal: ClinicalGoal,
): Promise<ActiveTemplateVersion | null> {
  const version = await prisma.templateVersion.findFirst({
    where: {
      status: "APPROVED",
      isActive: true,
      template: { clinicalGoal },
    },
    include: { template: true },
  });

  if (!version) return null;

  return {
    id: version.id,
    templateId: version.templateId,
    slug: version.template.slug,
    clinicalGoal: version.template.clinicalGoal as ClinicalGoal,
    title: version.template.title,
    version: version.version,
    content: version.content as unknown as TemplateContent,
    approvedBy: version.approvedBy!,
    approvedAt: version.approvedAt!,
  };
}

/**
 * Devolve uma versão por id, desde que tenha passado por aprovação
 * (status APPROVED — pode já não estar `isActive` se entretanto foi
 * substituída, o que é normal para sessões históricas que continuam
 * legítimas). Nunca devolve uma versão DRAFT, mesmo por id direto.
 */
export async function getApprovedVersionById(
  versionId: string,
): Promise<ActiveTemplateVersion | null> {
  const version = await prisma.templateVersion.findUnique({
    where: { id: versionId },
    include: { template: true },
  });

  if (!version || version.status !== "APPROVED") return null;

  return {
    id: version.id,
    templateId: version.templateId,
    slug: version.template.slug,
    clinicalGoal: version.template.clinicalGoal as ClinicalGoal,
    title: version.template.title,
    version: version.version,
    content: version.content as unknown as TemplateContent,
    approvedBy: version.approvedBy!,
    approvedAt: version.approvedAt!,
  };
}

export async function listAvailableGoals(): Promise<ClinicalGoal[]> {
  const versions = await prisma.templateVersion.findMany({
    where: { status: "APPROVED", isActive: true },
    include: { template: true },
    distinct: ["templateId"],
  });
  return versions.map((v) => v.template.clinicalGoal as ClinicalGoal);
}

/**
 * Exporta o conteúdo completo de todos os guiões atualmente ativos e
 * aprovados — usado para a fundadora rever/exportar tudo o que está
 * realmente em produção (ex: preparar gravações de voz), nunca para
 * gerar ou alterar conteúdo.
 */
export async function listAllActiveApprovedVersions(): Promise<ActiveTemplateVersion[]> {
  const versions = await prisma.templateVersion.findMany({
    where: { status: "APPROVED", isActive: true },
    include: { template: true },
    orderBy: { template: { clinicalGoal: "asc" } },
  });

  return versions.map((version) => ({
    id: version.id,
    templateId: version.templateId,
    slug: version.template.slug,
    clinicalGoal: version.template.clinicalGoal as ClinicalGoal,
    title: version.template.title,
    version: version.version,
    content: version.content as unknown as TemplateContent,
    approvedBy: version.approvedBy!,
    approvedAt: version.approvedAt!,
  }));
}

/**
 * Cria uma nova versão DRAFT. Nunca atualiza uma versão existente —
 * "alterações a um template exigem nova aprovação antes de substituir a
 * versão em produção — nada de edição silenciosa em produção" (secção 1).
 */
export async function createDraftVersion(params: {
  slug: string;
  clinicalGoal: ClinicalGoal;
  title: string;
  content: TemplateContent;
}): Promise<{ templateId: string; versionId: string; version: number }> {
  const parsedContent = templateContentSchema.parse(params.content);

  const template = await prisma.sessionTemplate.upsert({
    where: { slug: params.slug },
    update: {},
    create: {
      slug: params.slug,
      clinicalGoal: params.clinicalGoal,
      title: params.title,
    },
  });

  const lastVersion = await prisma.templateVersion.findFirst({
    where: { templateId: template.id },
    orderBy: { version: "desc" },
  });
  const nextVersion = (lastVersion?.version ?? 0) + 1;

  const created = await prisma.templateVersion.create({
    data: {
      templateId: template.id,
      version: nextVersion,
      status: "DRAFT",
      content: parsedContent,
    },
  });

  return { templateId: template.id, versionId: created.id, version: created.version };
}

/**
 * Aprova uma versão DRAFT e torna-a a única versão ativa e servível para o
 * seu objetivo clínico — numa transação, para nunca haver uma janela com
 * zero ou múltiplas versões ativas. Isto cobre dois casos distintos:
 *
 * 1. Uma nova versão do MESMO template (mesmo slug) substitui a anterior —
 *    a anterior fica isActive=false mas mantém status=APPROVED (histórico).
 * 2. Um template DIFERENTE (slug diferente) para o MESMO objetivo clínico
 *    assume o lugar — o anterior é explicitamente RETIRED, porque
 *    `findActiveApprovedVersionForGoal` só reconhece um objetivo por
 *    template e nunca deve devolver dois candidatos para o mesmo objetivo.
 */
export async function approveVersion(params: {
  versionId: string;
  approvedBy: string;
}): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const version = await tx.templateVersion.findUniqueOrThrow({
      where: { id: params.versionId },
      include: { template: true },
    });

    if (version.status !== "DRAFT") {
      throw new Error(
        `Só é possível aprovar versões em DRAFT (versão atual: ${version.status})`,
      );
    }

    await tx.templateVersion.updateMany({
      where: { templateId: version.templateId, isActive: true },
      data: { isActive: false },
    });

    await tx.templateVersion.updateMany({
      where: {
        templateId: { not: version.templateId },
        isActive: true,
        status: "APPROVED",
        template: { clinicalGoal: version.template.clinicalGoal },
      },
      data: { isActive: false, status: "RETIRED" },
    });

    await tx.templateVersion.update({
      where: { id: params.versionId },
      data: {
        status: "APPROVED",
        isActive: true,
        approvedBy: params.approvedBy,
        approvedAt: new Date(),
      },
    });
  });
}

/**
 * Retira definitivamente uma versão APPROVED de circulação (ex.: um
 * template de demonstração/placeholder que nunca devia voltar a ser
 * servido). Nunca apaga a linha — mantém-se como registo histórico com
 * status RETIRED, apenas deixa de ser candidata a `isActive`.
 */
export async function retireVersion(versionId: string): Promise<void> {
  const version = await prisma.templateVersion.findUniqueOrThrow({ where: { id: versionId } });

  if (version.status !== "APPROVED") {
    throw new Error(`Só é possível retirar versões APPROVED (versão atual: ${version.status})`);
  }

  await prisma.templateVersion.update({
    where: { id: versionId },
    data: { status: "RETIRED", isActive: false },
  });
}
