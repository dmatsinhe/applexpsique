import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../lib/prisma.js";
import { TemplateService } from "./template.service.js";
import type { TemplateContent } from "./template.types.js";

const service = new TemplateService();

function testContent(topic: string): TemplateContent {
  return {
    personalizableOpening: "Olá {{nome}}, vamos trabalhar em {{situacao}}.",
    sections: [
      { id: "inducao", title: "Indução", body: `Indução de teste para ${topic}.` },
      {
        id: "sugestoes-centrais",
        title: "Sugestões centrais",
        body: `Sugestão de teste 1 para ${topic}.\nSugestão de teste 2 para ${topic}.`,
      },
    ],
    anchorPhrases: ["Âncora de teste A", "Âncora de teste B"],
    closing: `Encerramento de teste para ${topic}.`,
    paceOptions: ["lento", "moderado"],
  };
}

async function cleanupSlug(slug: string) {
  const template = await prisma.sessionTemplate.findUnique({ where: { slug } });
  if (!template) return;
  await prisma.templateVersion.deleteMany({ where: { templateId: template.id } });
  await prisma.sessionTemplate.delete({ where: { id: template.id } });
}

describe("TemplateService — ciclo de aprovação (integração com Postgres real)", () => {
  const slug = "teste-pain-integracao";

  beforeEach(async () => {
    await cleanupSlug(slug);
  });

  afterAll(async () => {
    await cleanupSlug(slug);
    await prisma.$disconnect();
  });

  it("recusa explicitamente quando não existe versão aprovada para o objetivo", async () => {
    const result = await service.matchGoal("PAIN");
    expect(result.matched).toBe(false);
    if (!result.matched) {
      expect(result.availableGoals).not.toContain("PAIN");
    }
  });

  it("uma versão DRAFT nunca é servível, mesmo depois de criada", async () => {
    await service.submitDraft({
      slug,
      clinicalGoal: "PAIN",
      title: "Hábito (teste)",
      content: testContent("hábito"),
    });

    const result = await service.matchGoal("PAIN");
    expect(result.matched).toBe(false);
  });

  it("depois de aprovada, a versão fica ativa e servível; aprovação exige approvedBy", async () => {
    const draft = await service.submitDraft({
      slug,
      clinicalGoal: "PAIN",
      title: "Hábito (teste)",
      content: testContent("hábito"),
    });

    await expect(service.approve(draft.versionId, "")).rejects.toThrow();

    await service.approve(draft.versionId, "fundadora-teste@lexpsique.pt");

    const result = await service.matchGoal("PAIN");
    expect(result.matched).toBe(true);
    if (result.matched) {
      expect(result.template.approvedBy).toBe("fundadora-teste@lexpsique.pt");
      expect(result.template.content.personalizableOpening).toContain("{{nome}}");
    }
  });

  it("uma nova versão aprovada substitui a anterior como única ativa (nunca zero, nunca duas)", async () => {
    const v1 = await service.submitDraft({
      slug,
      clinicalGoal: "PAIN",
      title: "Hábito (teste) v1",
      content: testContent("hábito v1"),
    });
    await service.approve(v1.versionId, "fundadora-teste@lexpsique.pt");

    const v2 = await service.submitDraft({
      slug,
      clinicalGoal: "PAIN",
      title: "Hábito (teste) v2",
      content: testContent("hábito v2"),
    });
    await service.approve(v2.versionId, "fundadora-teste@lexpsique.pt");

    const activeVersions = await prisma.templateVersion.findMany({
      where: { templateId: v1.templateId, isActive: true },
    });
    expect(activeVersions).toHaveLength(1);
    expect(activeVersions[0].id).toBe(v2.versionId);
  });

  it("aprovar um template DIFERENTE para o mesmo objetivo retira o anterior (nunca dois candidatos para o mesmo objetivo)", async () => {
    const otherSlug = `${slug}-concorrente`;
    await cleanupSlug(otherSlug);

    const placeholder = await service.submitDraft({
      slug,
      clinicalGoal: "PAIN",
      title: "Hábito (placeholder)",
      content: testContent("hábito placeholder"),
    });
    await service.approve(placeholder.versionId, "fundadora-teste@lexpsique.pt");

    const real = await service.submitDraft({
      slug: otherSlug,
      clinicalGoal: "PAIN",
      title: "Hábito (real)",
      content: testContent("hábito real"),
    });
    await service.approve(real.versionId, "fundadora-teste@lexpsique.pt");

    const result = await service.matchGoal("PAIN");
    expect(result.matched).toBe(true);
    if (result.matched) {
      expect(result.template.id).toBe(real.versionId);
    }

    const retiredPlaceholder = await prisma.templateVersion.findUniqueOrThrow({
      where: { id: placeholder.versionId },
    });
    expect(retiredPlaceholder.status).toBe("RETIRED");
    expect(retiredPlaceholder.isActive).toBe(false);

    await cleanupSlug(otherSlug);
  });

  it("retire() remove definitivamente uma versão APPROVED de circulação", async () => {
    const draft = await service.submitDraft({
      slug,
      clinicalGoal: "PAIN",
      title: "Hábito (teste)",
      content: testContent("hábito"),
    });
    await service.approve(draft.versionId, "fundadora-teste@lexpsique.pt");

    await service.retire(draft.versionId);

    const result = await service.matchGoal("PAIN");
    expect(result.matched).toBe(false);

    const retired = await prisma.templateVersion.findUniqueOrThrow({ where: { id: draft.versionId } });
    expect(retired.status).toBe("RETIRED");
    expect(retired.isActive).toBe(false);

    await expect(service.retire(draft.versionId)).rejects.toThrow();
  });
});
