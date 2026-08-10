import { CrisisService, resolveClarification, type ClarificationResolution } from "../crisis/crisis.service.js";
import { needsClarification } from "../crisis/crisis.types.js";
import { TemplateService } from "../templates/template.service.js";
import {
  createCheckIn,
  getCheckIn,
  recordMatch,
  updateCrisisLevel,
} from "./checkin.repository.js";
import { freeTextAnswers, type CheckInOutcome, type CheckInSubmission } from "./checkin.types.js";

export class CheckInService {
  constructor(
    private readonly crisisService: CrisisService = new CrisisService(),
    private readonly templateService: TemplateService = new TemplateService(),
  ) {}

  /**
   * Ponto de entrada único do check-in. Ordem estrita, nunca invertida
   * (secção 5 — "requisito de segurança inegociável"):
   *   1. Classificador de crise sobre TODO texto livre.
   *   2. Só depois, se ABSENT, seleção de template.
   */
  async submit(submission: CheckInSubmission): Promise<CheckInOutcome> {
    const crisisOutcome = await this.crisisService.evaluate({
      userId: submission.userId,
      texts: freeTextAnswers(submission),
      source: "checkin",
      locale: submission.locale,
    });

    if (crisisOutcome.result.level === "CLEAR") {
      // Não se persiste sequer um CheckIn associável a seleção de template —
      // a sessão automatizada para imediatamente, sem oferecer continuar.
      await createCheckIn({ submission, crisisSignalLevel: "CLEAR" });
      return {
        kind: "crisis_clear",
        response: crisisOutcome.response!,
        noRealTimeSupervisionNotice: crisisOutcome.noRealTimeSupervisionNotice!,
      };
    }

    if (needsClarification(crisisOutcome.result.level)) {
      const { id } = await createCheckIn({
        submission,
        crisisSignalLevel: crisisOutcome.result.level,
      });
      return {
        kind: "crisis_needs_clarification",
        checkInId: id,
        response: crisisOutcome.response!,
        noRealTimeSupervisionNotice: crisisOutcome.noRealTimeSupervisionNotice!,
        clarification: crisisOutcome.clarification!,
      };
    }

    if (crisisOutcome.result.level === "AMBIGUOUS") {
      const { id } = await createCheckIn({ submission, crisisSignalLevel: "AMBIGUOUS" });
      return {
        kind: "crisis_ambiguous",
        checkInId: id,
        response: crisisOutcome.response!,
        noRealTimeSupervisionNotice: crisisOutcome.noRealTimeSupervisionNotice!,
        acknowledgement: crisisOutcome.acknowledgement!,
      };
    }

    const { id } = await createCheckIn({ submission, crisisSignalLevel: "ABSENT" });
    return this.matchTemplate(id, submission.requestedGoal);
  }

  /**
   * Resolve um check-in em DIRECT_MENTION/SELF_HARM depois de o utilizador
   * responder à pergunta de esclarecimento — nunca uma avaliação humana,
   * apenas o próprio relato da pessoa a decidir a gravidade final (secção
   * 5). ESCALATE nunca mais permite continuar; DOWNGRADE devolve o mesmo
   * fluxo de reconhecimento + oferta de continuar do nível AMBIGUOUS.
   */
  async resolveCrisisClarification(
    checkInId: string,
    resolution: ClarificationResolution,
  ): Promise<CheckInOutcome> {
    const checkIn = await getCheckIn(checkInId);

    if (!needsClarification(checkIn.crisisSignalLevel)) {
      throw new Error(
        "Este check-in não está à espera de uma resposta de esclarecimento.",
      );
    }

    const resolvedLevel = resolveClarification(resolution);
    await updateCrisisLevel(checkInId, resolvedLevel);

    if (resolvedLevel === "CLEAR") {
      const outcome = this.crisisService.resolvedOutcome(
        resolution,
        this.crisisService.classifierVersion,
        "pt-PT",
      );
      return {
        kind: "crisis_clear",
        response: outcome.response!,
        noRealTimeSupervisionNotice: outcome.noRealTimeSupervisionNotice!,
      };
    }

    const outcome = this.crisisService.resolvedOutcome(
      resolution,
      this.crisisService.classifierVersion,
      "pt-PT",
    );
    return {
      kind: "crisis_ambiguous",
      checkInId,
      response: outcome.response!,
      noRealTimeSupervisionNotice: outcome.noRealTimeSupervisionNotice!,
      acknowledgement: outcome.acknowledgement!,
    };
  }

  /**
   * Só pode ser chamado depois de o utilizador ter visto o reconhecimento
   * de sinal ambíguo e escolhido ativamente continuar — nunca automático.
   * Re-valida que o check-in está mesmo em AMBIGUOUS (defesa em
   * profundidade: nunca confiar só no estado do cliente, nem permitir
   * saltar uma pergunta de esclarecimento por resolver).
   */
  async continueAfterAmbiguousAcknowledgement(checkInId: string): Promise<CheckInOutcome> {
    const checkIn = await getCheckIn(checkInId);

    if (checkIn.crisisSignalLevel !== "AMBIGUOUS") {
      throw new Error(
        "Só é possível continuar um check-in com sinal AMBIGUOUS já reconhecido — sem exceções.",
      );
    }
    if (!checkIn.requestedGoal) {
      throw new Error("Check-in sem objetivo pedido — estado inválido.");
    }

    return this.matchTemplate(checkInId, checkIn.requestedGoal);
  }

  private async matchTemplate(
    checkInId: string,
    requestedGoal: NonNullable<CheckInSubmission["requestedGoal"]>,
  ): Promise<CheckInOutcome> {
    const match = await this.templateService.matchGoal(requestedGoal);

    if (!match.matched) {
      await recordMatch({ checkInId, templateVersionId: null, refusedNoTemplateAvailable: true });
      return { kind: "no_template_available", checkInId, availableGoals: match.availableGoals };
    }

    await recordMatch({
      checkInId,
      templateVersionId: match.template.id,
      refusedNoTemplateAvailable: false,
    });

    return {
      kind: "matched",
      checkInId,
      templateVersionId: match.template.id,
      templateTitle: match.template.title,
      clinicalGoal: match.template.clinicalGoal,
      paceOptions: match.template.content.paceOptions,
    };
  }
}
