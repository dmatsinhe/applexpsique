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
 * Aprova uma versão DRAFT e torna-a a única versão ativa do template,
 * desativando qualquer versão anteriormente ativa — numa transação, para
 * nunca haver uma janela com zero ou múltiplas versões ativas.
 */
export async function approveVersion(params: {
  versionId: string;
  approvedBy: string;
}): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const version = await tx.templateVersion.findUniqueOrThrow({
      where: { id: params.versionId },
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
