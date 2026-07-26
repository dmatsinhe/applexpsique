import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../lib/prisma.js";
import { CheckInService } from "./checkin.service.js";
import { TemplateService } from "../templates/template.service.js";
import type { CheckInSubmission } from "./checkin.types.js";
import type { ClinicalGoal, TemplateContent } from "../templates/template.types.js";

const checkInService = new CheckInService();
const templateService = new TemplateService();

let userId: string;

function baseSubmission(overrides: Partial<CheckInSubmission> = {}): CheckInSubmission {
  return {
    userId,
    locale: "pt-PT",
    requestedGoal: "SLEEP",
    recentFeelingText: "Tenho dormido mal por causa do trabalho.",
    situationNote: "Tenho uma apresentação importante esta semana.",
    energyLevel: 3,
    additionalNote: "",
    ...overrides,
  };
}

function testContent(): TemplateContent {
  return {
    induction: "Indução de teste.",
    coreSuggestions: ["Sugestão 1", "Sugestão 2"],
    anchorPhrases: ["Âncora A", "Âncora B"],
    closing: "Encerramento de teste.",
    personalizableOpening: "Olá {{nome}}, vamos focar-nos em {{situacao}}.",
    paceOptions: ["lento", "moderado"],
  };
}

async function approveTemplateForGoal(slug: string, clinicalGoal: ClinicalGoal) {
  const draft = await templateService.submitDraft({
    slug,
    clinicalGoal,
    title: `Teste ${clinicalGoal}`,
    content: testContent(),
  });
  await templateService.approve(draft.versionId, "fundadora-teste@lexpsique.pt");
}

async function cleanupSlug(slug: string) {
  const template = await prisma.sessionTemplate.findUnique({ where: { slug } });
  if (!template) return;
  await prisma.checkIn.updateMany({
    where: { matchedTemplateVersionId: { in: (await prisma.templateVersion.findMany({ where: { templateId: template.id }, select: { id: true } })).map((v) => v.id) } },
    data: { matchedTemplateVersionId: null },
  });
  await prisma.templateVersion.deleteMany({ where: { templateId: template.id } });
  await prisma.sessionTemplate.delete({ where: { id: template.id } });
}

describe("CheckInService — fluxo completo (integração com Postgres real)", () => {
  const sleepSlug = "teste-checkin-sono";

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email: `checkin-test-${Date.now()}@lexpsique.pt`,
        passwordHash: "not-a-real-hash",
        isAdultVerified: true,
        ageVerifiedAt: new Date(),
      },
    });
    userId = user.id;
    await cleanupSlug(sleepSlug);
  });

  afterAll(async () => {
    await cleanupSlug(sleepSlug);
    await prisma.checkIn.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("sinal CLARO para a sessão imediatamente, nunca oferece continuar", async () => {
    const outcome = await checkInService.submit(
      baseSubmission({ recentFeelingText: "Só quero acabar com tudo, não aguento mais viver." }),
    );
    expect(outcome.kind).toBe("crisis_clear");
    if (outcome.kind === "crisis_clear") {
      expect(outcome.resources.length).toBeGreaterThan(0);
    }
  });

  it("sinal AMBÍGUO mostra recursos + reconhecimento, e só continua após confirmação explícita", async () => {
    await approveTemplateForGoal(sleepSlug, "SLEEP");

    const outcome = await checkInService.submit(
      baseSubmission({ recentFeelingText: "Sinto que já não aguento mais, está tudo muito difícil." }),
    );
    expect(outcome.kind).toBe("crisis_ambiguous");
    if (outcome.kind !== "crisis_ambiguous") throw new Error("unreachable");
    expect(outcome.resources.length).toBeGreaterThan(0);
    expect(outcome.acknowledgement.length).toBeGreaterThan(0);

    const continued = await checkInService.continueAfterAmbiguousAcknowledgement(outcome.checkInId);
    expect(continued.kind).toBe("matched");
  });

  it("nunca permite continuar um check-in cujo sinal foi CLARO", async () => {
    const clearCheckIn = await prisma.checkIn.create({
      data: {
        userId,
        answersEncrypted: "irrelevant",
        requestedGoal: "SLEEP",
        crisisSignalLevel: "CLEAR",
      },
    });

    await expect(
      checkInService.continueAfterAmbiguousAcknowledgement(clearCheckIn.id),
    ).rejects.toThrow();

    await prisma.checkIn.delete({ where: { id: clearCheckIn.id } });
  });

  it("recusa explicitamente quando não há template aprovado para o objetivo (sem crise)", async () => {
    const outcome = await checkInService.submit(
      baseSubmission({ requestedGoal: "GRIEF", recentFeelingText: "Sinto-me triste, mas sem sinais de crise." }),
    );
    expect(outcome.kind).toBe("no_template_available");
    if (outcome.kind === "no_template_available") {
      expect(outcome.availableGoals).not.toContain("GRIEF");
    }
  });

  it("sem sinal de crise e com template aprovado, corresponde ao template certo", async () => {
    const outcome = await checkInService.submit(baseSubmission({ requestedGoal: "SLEEP" }));
    expect(outcome.kind).toBe("matched");
    if (outcome.kind === "matched") {
      expect(outcome.clinicalGoal).toBe("SLEEP");
    }
  });
});
