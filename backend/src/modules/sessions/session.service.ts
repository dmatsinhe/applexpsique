import { TemplateService } from "../templates/template.service.js";
import { PersonalizationService } from "./personalization.service.js";
import {
  abandonSession,
  completeSession,
  createTherapySession,
  getTherapySession,
  updateResumePosition,
} from "./session.repository.js";
import type { PersonalizationInput } from "./personalization.types.js";

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
    const template = await this.templateService.getApprovedVersionById(params.templateVersionId);
    if (!template) {
      throw new Error(
        "Template não encontrado ou não aprovado — não é possível criar sessão a partir dele.",
      );
    }

    const rendered = this.personalizationService.render(template, params.personalization);

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
