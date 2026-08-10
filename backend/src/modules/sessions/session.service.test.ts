import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../lib/prisma.js";
import { SessionService } from "./session.service.js";
import { TemplateService } from "../templates/template.service.js";
import type { TemplateContent } from "../templates/template.types.js";

const sessionService = new SessionService();
const templateService = new TemplateService();

let userId: string;
let templateVersionId: string;
const slug = "teste-sessao-integracao";

function testContent(): TemplateContent {
  return {
    personalizableOpening: "Olá {{nome}}, hoje vamos trabalhar {{situacao}}.",
    sections: [
      { id: "inducao", title: "Indução", body: "Indução fixa de teste." },
      { id: "sugestoes-centrais", title: "Sugestões centrais", body: "Sugestão fixa 1\nSugestão fixa 2" },
    ],
    anchorPhrases: ["Âncora A", "Âncora B"],
    closing: "Encerramento fixo de teste.",
    paceOptions: ["lento", "moderado"],
  };
}

async function cleanup() {
  const template = await prisma.sessionTemplate.findUnique({ where: { slug } });
  if (!template) return;
  const versions = await prisma.templateVersion.findMany({ where: { templateId: template.id } });
  await prisma.therapySession.deleteMany({
    where: { templateVersionId: { in: versions.map((v) => v.id) } },
  });
  await prisma.templateVersion.deleteMany({ where: { templateId: template.id } });
  await prisma.sessionTemplate.delete({ where: { id: template.id } });
}

describe("SessionService — personalização + persistência encriptada + retoma (integração)", () => {
  beforeAll(async () => {
    await cleanup();
    const user = await prisma.user.create({
      data: {
        email: `session-test-${Date.now()}@lexpsique.pt`,
        passwordHash: "not-a-real-hash",
        isAdultVerified: true,
        ageVerifiedAt: new Date(),
      },
    });
    userId = user.id;

    const draft = await templateService.submitDraft({
      slug,
      clinicalGoal: "FOCUS",
      title: "Foco (teste)",
      content: testContent(),
    });
    await templateService.approve(draft.versionId, "fundadora-teste@lexpsique.pt");
    templateVersionId = draft.versionId;
  });

  afterAll(async () => {
    await cleanup();
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("rejeita criar sessão a partir de um template DRAFT (não aprovado)", async () => {
    const draft = await templateService.submitDraft({
      slug: `${slug}-draft-only`,
      clinicalGoal: "PAIN",
      title: "Dor (teste, nunca aprovado)",
      content: testContent(),
    });

    await expect(
      sessionService.createFromMatchedTemplate({
        userId,
        templateVersionId: draft.versionId,
        personalization: { name: "Ana", pace: "lento" },
      }),
    ).rejects.toThrow();

    await prisma.templateVersion.deleteMany({ where: { id: draft.versionId } });
    await prisma.sessionTemplate.deleteMany({ where: { slug: `${slug}-draft-only` } });
  });

  it("cria uma sessão personalizada e guarda o conteúdo encriptado (não em claro na base de dados)", async () => {
    const { sessionId, rendered } = await sessionService.createFromMatchedTemplate({
      userId,
      templateVersionId,
      personalization: { name: "Ana", situationNote: "o exame de amanhã", pace: "lento" },
    });

    expect(rendered.opening).toBe("Olá Ana, hoje vamos trabalhar o exame de amanhã.");

    const rawRow = await prisma.therapySession.findUniqueOrThrow({ where: { id: sessionId } });
    expect(rawRow.renderedContentEncrypted).not.toContain("Ana");
    expect(rawRow.renderedContentEncrypted).not.toContain("exame");

    const fetched = await sessionService.get(sessionId);
    expect(fetched.rendered.opening).toBe(rendered.opening);
    expect(fetched.status).toBe("IN_PROGRESS");
  });

  it("permite retomar a partir da posição guardada em vez de reiniciar do zero", async () => {
    const { sessionId } = await sessionService.createFromMatchedTemplate({
      userId,
      templateVersionId,
      personalization: { name: "Bruno", pace: "moderado" },
    });

    await sessionService.saveResumePosition(sessionId, 87);
    const fetched = await sessionService.get(sessionId);
    expect(fetched.resumePositionSeconds).toBe(87);

    await expect(sessionService.saveResumePosition(sessionId, -5)).rejects.toThrow();

    await sessionService.complete(sessionId);
    const completed = await sessionService.get(sessionId);
    expect(completed.status).toBe("COMPLETED");
    expect(completed.completedAt).not.toBeNull();
  });
});
