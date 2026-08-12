import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "../../lib/prisma.js";
import { DailySessionLimitReachedError, FREE_PLAN_DAILY_SESSION_LIMIT, SessionService } from "./session.service.js";
import { TemplateService } from "../templates/template.service.js";
import type { TemplateContent } from "../templates/template.types.js";

const sessionService = new SessionService();
const templateService = new TemplateService();
const slug = "teste-limite-diario-integracao";

function testContent(): TemplateContent {
  return {
    personalizableOpening: "Olá {{nome}}, hoje vamos trabalhar {{situacao}}.",
    sections: [{ id: "inducao", title: "Indução", body: "Indução fixa de teste." }],
    anchorPhrases: ["Âncora de teste."],
    closing: "Encerramento fixo de teste.",
    paceOptions: ["lento"],
  };
}

let createdUserIds: string[] = [];

async function createTestUser(email: string, plan: "FREE" | "PREMIUM") {
  const user = await prisma.user.create({
    data: { email, passwordHash: "not-a-real-hash", isAdultVerified: true, ageVerifiedAt: new Date(), plan },
  });
  createdUserIds.push(user.id);
  return user;
}

async function approvedTemplateVersionId(): Promise<string> {
  const existing = await prisma.sessionTemplate.findUnique({ where: { slug } });
  if (existing) {
    const active = await prisma.templateVersion.findFirst({ where: { templateId: existing.id, isActive: true } });
    if (active) return active.id;
  }
  const draft = await templateService.submitDraft({
    slug,
    clinicalGoal: "FOCUS",
    title: "Foco (teste limite diário)",
    content: testContent(),
  });
  await templateService.approve(draft.versionId, "fundadora-teste@lexpsique.pt");
  return draft.versionId;
}

afterEach(async () => {
  await prisma.therapySession.deleteMany({ where: { userId: { in: createdUserIds } } });
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  createdUserIds = [];
});

describe("SessionService — limite diário do plano Grátis (secção de negócio)", () => {
  it("permite ao plano Grátis criar a primeira sessão do dia", async () => {
    const user = await createTestUser(`limite-free-primeira-${Date.now()}@lexpsique.pt`, "FREE");
    const templateVersionId = await approvedTemplateVersionId();

    await expect(
      sessionService.createFromMatchedTemplate({
        userId: user.id,
        templateVersionId,
        personalization: { name: "Ana", pace: "lento" },
      }),
    ).resolves.toBeDefined();
  });

  it("recusa uma segunda sessão no mesmo dia para o plano Grátis", async () => {
    const user = await createTestUser(`limite-free-segunda-${Date.now()}@lexpsique.pt`, "FREE");
    const templateVersionId = await approvedTemplateVersionId();

    await sessionService.createFromMatchedTemplate({
      userId: user.id,
      templateVersionId,
      personalization: { name: "Ana", pace: "lento" },
    });

    await expect(
      sessionService.createFromMatchedTemplate({
        userId: user.id,
        templateVersionId,
        personalization: { name: "Ana", pace: "lento" },
      }),
    ).rejects.toBeInstanceOf(DailySessionLimitReachedError);
  });

  it("não limita o plano Premium a sessões múltiplas no mesmo dia", async () => {
    const user = await createTestUser(`limite-premium-${Date.now()}@lexpsique.pt`, "PREMIUM");
    const templateVersionId = await approvedTemplateVersionId();

    for (let i = 0; i < FREE_PLAN_DAILY_SESSION_LIMIT + 2; i++) {
      await expect(
        sessionService.createFromMatchedTemplate({
          userId: user.id,
          templateVersionId,
          personalization: { name: "Bruno", pace: "lento" },
        }),
      ).resolves.toBeDefined();
    }
  });

  it("volta a permitir uma sessão no dia seguinte (contagem por dia, não permanente)", async () => {
    const user = await createTestUser(`limite-free-dia-seguinte-${Date.now()}@lexpsique.pt`, "FREE");
    const templateVersionId = await approvedTemplateVersionId();

    const { sessionId } = await sessionService.createFromMatchedTemplate({
      userId: user.id,
      templateVersionId,
      personalization: { name: "Ana", pace: "lento" },
    });

    // Simula que a sessão de hoje foi na verdade ontem — a contagem é
    // sempre "desde a meia-noite de hoje", não um limite permanente.
    await prisma.therapySession.update({
      where: { id: sessionId },
      data: { startedAt: new Date(Date.now() - 25 * 60 * 60 * 1000) },
    });

    await expect(
      sessionService.createFromMatchedTemplate({
        userId: user.id,
        templateVersionId,
        personalization: { name: "Ana", pace: "lento" },
      }),
    ).resolves.toBeDefined();
  });
});
