import {
  approveVersion,
  createDraftVersion,
  findActiveApprovedVersionForGoal,
  getApprovedVersionById,
  listAllActiveApprovedVersions,
  listAvailableGoals,
  retireVersion,
  type ActiveTemplateVersion,
} from "./template.repository.js";
import type { ClinicalGoal, TemplateContent } from "./template.types.js";

export type TemplateMatchResult =
  | { matched: true; template: ActiveTemplateVersion }
  | { matched: false; availableGoals: ClinicalGoal[] };

export class TemplateService {
  /**
   * Ponto único onde a "recusa explícita" da secção 1 acontece: se não
   * existir versão aprovada e ativa para o objetivo pedido, devolve a lista
   * de objetivos disponíveis para sugerir ao utilizador — nunca inventa
   * conteúdo.
   */
  async matchGoal(clinicalGoal: ClinicalGoal): Promise<TemplateMatchResult> {
    const template = await findActiveApprovedVersionForGoal(clinicalGoal);
    if (template) {
      return { matched: true, template };
    }
    const availableGoals = await listAvailableGoals();
    return { matched: false, availableGoals };
  }

  async getApprovedVersionById(versionId: string): Promise<ActiveTemplateVersion | null> {
    return getApprovedVersionById(versionId);
  }

  async listAllActive(): Promise<ActiveTemplateVersion[]> {
    return listAllActiveApprovedVersions();
  }

  async submitDraft(params: {
    slug: string;
    clinicalGoal: ClinicalGoal;
    title: string;
    content: TemplateContent;
  }) {
    return createDraftVersion(params);
  }

  /**
   * `approvedBy` tem de identificar uma pessoa real com autoridade clínica
   * — este método não valida isso (é uma decisão de processo/autenticação
   * fora do âmbito deste serviço), mas nunca aceita omissão do campo.
   */
  async approve(versionId: string, approvedBy: string) {
    if (!approvedBy || approvedBy.trim().length === 0) {
      throw new Error("approvedBy é obrigatório para aprovar um template");
    }
    return approveVersion({ versionId, approvedBy });
  }

  async retire(versionId: string) {
    return retireVersion(versionId);
  }
}
