import { TemplateService } from "../templates/template.service.js";
import { PersonalizationService } from "./personalization.service.js";
import {
  abandonSession,
  completeSession,
  countTherapySessionsSince,
  createTherapySession,
  getTherapySession,
  getUserPlan,
  updateResumePosition,
} from "./session.repository.js";
import type { PersonalizationInput } from "./personalization.types.js";

/**
 * Distinção Grátis/Premium (ver docs/interno/preco-e-nome.md): Grátis tem
 * direito a uma sessão por dia, Premium é ilimitado. Nunca aplicado ao
 * check-in em si nem aos fluxos de crise — só à criação da sessão de
 * hipnose já correspondida, o "exercício" que a página de preços descreve.
 */
export const FREE_PLAN_DAILY_SESSION_LIMIT = 1;

export class DailySessionLimitReachedError extends Error {}

export class SessionService {
  constructor(
    private readonly templateService: TemplateService = new TemplateService(),
    private readonly personalizationService: PersonalizationService = new PersonalizationService(),
  ) {}

  /**
   * Cria uma sessão personalizada a partir de um template já aprovado e
   * correspondido no check-in. Nunca aceita um templateVersionId que não
   * tenha passado por aprovação (ver TemplateService.getApprovedVersionById).
   */
  async createFromMatchedTemplate(params: {
    userId: string;
    templateVersionId: string;
    personalization: PersonalizationInput;
  }) {
    const plan = await getUserPlan(params.userId);
    if (plan === "FREE") {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const sessionsToday = await countTherapySessionsSince(params.userId, startOfToday);
      if (sessionsToday >= FREE_PLAN_DAILY_SESSION_LIMIT) {
        throw new DailySessionLimitReachedError(
          "Já usou a sua sessão gratuita de hoje. Volte amanhã ou torne-se Premium para sessões ilimitadas.",
        );
      }
    }

    const template = await this.templateService.getApprovedVersionById(params.templateVersionId);
    if (!template) {
      throw new Error(
        "Template não encontrado ou não aprovado — não é possível criar sessão a partir dele.",
      );
    }

    const rendered = await this.personalizationService.render(template, params.personalization, plan === "PREMIUM");

    const { id } = await createTherapySession({
      userId: params.userId,
      templateVersionId: params.templateVersionId,
      personalization: params.personalization,
      rendered,
    });

    return { sessionId: id, rendered };
  }

  async get(sessionId: string) {
    return getTherapySession(sessionId);
  }

  async saveResumePosition(sessionId: string, positionSeconds: number) {
    if (positionSeconds < 0) {
      throw new Error("resumePositionSeconds não pode ser negativo");
    }
    await updateResumePosition(sessionId, positionSeconds);
  }

  async complete(sessionId: string) {
    await completeSession(sessionId);
  }

  async abandon(sessionId: string) {
    await abandonSession(sessionId);
  }
}
