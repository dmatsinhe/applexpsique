import { CrisisService } from "../crisis/crisis.service.js";
import { TemplateService } from "../templates/template.service.js";
import { createCheckIn, getCheckIn, recordMatch } from "./checkin.repository.js";
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
   * Só pode ser chamado depois de o utilizador ter visto o reconhecimento
   * de sinal ambíguo e escolhido ativamente continuar — nunca automático.
   * Re-valida que o check-in não foi classificado como CLEAR (defesa em
   * profundidade: nunca confiar só no estado do cliente).
   */
  async continueAfterAmbiguousAcknowledgement(checkInId: string): Promise<CheckInOutcome> {
    const checkIn = await getCheckIn(checkInId);

    if (checkIn.crisisSignalLevel === "CLEAR") {
      throw new Error(
        "Não é possível continuar um check-in com sinal de crise CLARO — sem exceções.",
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
