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
    personalizableOpening: "Olá {{nome}}, vamos focar-nos em {{situacao}}.",
    sections: [
      { id: "inducao", title: "Indução", body: "Indução de teste." },
      { id: "sugestoes-centrais", title: "Sugestões centrais", body: "Sugestão 1\nSugestão 2" },
    ],
    anchorPhrases: ["Âncora A", "Âncora B"],
    closing: "Encerramento de teste.",
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
  const anxietySlug = "teste-checkin-ansiedade";
  const selfEsteemSlug = "teste-checkin-autoestima";
  const griefSlug = "teste-checkin-luto";

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
    await cleanupSlug(anxietySlug);
    await cleanupSlug(selfEsteemSlug);
    await cleanupSlug(griefSlug);
  });

  afterAll(async () => {
    await cleanupSlug(sleepSlug);
    await cleanupSlug(anxietySlug);
    await cleanupSlug(selfEsteemSlug);
    await cleanupSlug(griefSlug);
    await prisma.checkIn.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("sinal CLARO (intenção/plano/preparação) para a sessão imediatamente, mostra os 3 blocos e nunca oferece continuar", async () => {
    const outcome = await checkInService.submit(
      baseSubmission({ recentFeelingText: "Já tenho um plano para morrer, só falta a coragem." }),
    );
    expect(outcome.kind).toBe("crisis_clear");
    if (outcome.kind === "crisis_clear") {
      expect(outcome.response.immediateResources.length).toBeGreaterThan(0);
      expect(outcome.response.regionalProfessionalSupport.length).toBeGreaterThan(0);
      expect(outcome.response.founderPrivateContact.disclaimerLabel).toContain("NÃO");
      expect(outcome.noRealTimeSupervisionNotice.length).toBeGreaterThan(0);
    }
  });

  it("menção direta a suicídio pede esclarecimento; ESCALATE bloqueia como CLARO, DOWNGRADE permite continuar", async () => {
    const needsClarificationOutcome = await checkInService.submit(
      baseSubmission({ recentFeelingText: "Só quero acabar com tudo, não aguento mais viver." }),
    );
    expect(needsClarificationOutcome.kind).toBe("crisis_needs_clarification");
    if (needsClarificationOutcome.kind !== "crisis_needs_clarification") throw new Error("unreachable");
    expect(needsClarificationOutcome.clarification.level).toBe("DIRECT_MENTION");
    expect(needsClarificationOutcome.clarification.options.length).toBeGreaterThanOrEqual(2);

    const escalated = await checkInService.resolveCrisisClarification(
      needsClarificationOutcome.checkInId,
      "ESCALATE",
    );
    expect(escalated.kind).toBe("crisis_clear");

    await expect(
      checkInService.resolveCrisisClarification(needsClarificationOutcome.checkInId, "DOWNGRADE"),
    ).rejects.toThrow();

    const secondSubmission = await checkInService.submit(
      baseSubmission({ recentFeelingText: "Queria desaparecer para sempre, às vezes penso nisso." }),
    );
    if (secondSubmission.kind !== "crisis_needs_clarification") throw new Error("unreachable");

    const downgraded = await checkInService.resolveCrisisClarification(
      secondSubmission.checkInId,
      "DOWNGRADE",
    );
    expect(downgraded.kind).toBe("crisis_ambiguous");
  });

  it("autolesão pede esclarecimento próprio, distinto de menção direta", async () => {
    const outcome = await checkInService.submit(
      baseSubmission({ recentFeelingText: "Ando a magoar-me de propósito quase todos os dias." }),
    );
    expect(outcome.kind).toBe("crisis_needs_clarification");
    if (outcome.kind !== "crisis_needs_clarification") throw new Error("unreachable");
    expect(outcome.clarification.level).toBe("SELF_HARM");
  });

  it("sinal AMBÍGUO mostra recursos + reconhecimento, e só continua após confirmação explícita", async () => {
    await approveTemplateForGoal(sleepSlug, "SLEEP");

    const outcome = await checkInService.submit(
      baseSubmission({ recentFeelingText: "Sinto que já não aguento mais, está tudo muito difícil." }),
    );
    expect(outcome.kind).toBe("crisis_ambiguous");
    if (outcome.kind !== "crisis_ambiguous") throw new Error("unreachable");
    expect(outcome.response.immediateResources.length).toBeGreaterThan(0);
    expect(outcome.noRealTimeSupervisionNotice.length).toBeGreaterThan(0);
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

  it("Ansiedade generalizada com autorrelato de contraindicação recusa a sessão, mesmo com template aprovado", async () => {
    await approveTemplateForGoal(anxietySlug, "GENERALIZED_ANXIETY");

    const outcome = await checkInService.submit(
      baseSubmission({
        requestedGoal: "GENERALIZED_ANXIETY",
        contraindicationSelfReport: true,
      }),
    );
    expect(outcome.kind).toBe("contraindication_flagged");
    if (outcome.kind === "contraindication_flagged") {
      expect(outcome.response.immediateResources.length).toBeGreaterThan(0);
      expect(outcome.response.regionalProfessionalSupport.length).toBeGreaterThan(0);
      expect(outcome.message.length).toBeGreaterThan(0);
    }
  });

  it("Ansiedade generalizada sem contraindicação reportada corresponde normalmente ao template", async () => {
    const outcome = await checkInService.submit(
      baseSubmission({
        requestedGoal: "GENERALIZED_ANXIETY",
        contraindicationSelfReport: false,
      }),
    );
    expect(outcome.kind).toBe("matched");
    if (outcome.kind === "matched") {
      expect(outcome.clinicalGoal).toBe("GENERALIZED_ANXIETY");
    }
  });

  it("a pergunta de contraindicação é ignorada para objetivos que não a exigem", async () => {
    const outcome = await checkInService.submit(
      baseSubmission({ requestedGoal: "SLEEP", contraindicationSelfReport: true }),
    );
    expect(outcome.kind).toBe("matched");
  });

  it("Autoestima tem a sua própria pergunta/mensagem de contraindicação, distinta de Ansiedade", async () => {
    await approveTemplateForGoal(selfEsteemSlug, "SELF_ESTEEM");

    const flagged = await checkInService.submit(
      baseSubmission({ requestedGoal: "SELF_ESTEEM", contraindicationSelfReport: true }),
    );
    expect(flagged.kind).toBe("contraindication_flagged");
    if (flagged.kind === "contraindication_flagged") {
      expect(flagged.message).toContain("perturbação alimentar");
      expect(flagged.message).not.toContain("mania");
    }

    const matched = await checkInService.submit(
      baseSubmission({ requestedGoal: "SELF_ESTEEM", contraindicationSelfReport: false }),
    );
    expect(matched.kind).toBe("matched");
  });

  it("Luto tem a sua própria pergunta/mensagem de contraindicação, distinta das outras", async () => {
    await approveTemplateForGoal(griefSlug, "GRIEF");

    const flagged = await checkInService.submit(
      baseSubmission({ requestedGoal: "GRIEF", contraindicationSelfReport: true }),
    );
    expect(flagged.kind).toBe("contraindication_flagged");
    if (flagged.kind === "contraindication_flagged") {
      expect(flagged.message).toContain("desorganização grave");
      expect(flagged.message).not.toContain("perturbação alimentar");
    }

    const matched = await checkInService.submit(
      baseSubmission({ requestedGoal: "GRIEF", contraindicationSelfReport: false }),
    );
    expect(matched.kind).toBe("matched");
  });
});
