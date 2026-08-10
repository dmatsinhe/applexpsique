import type { ClinicalGoal } from "../templates/template.types.js";
import type { CrisisLevel } from "../crisis/crisis.types.js";
import type { CrisisResponseBundle } from "../crisis/crisis-resources.js";
import type { CrisisClarificationPrompt } from "../crisis/crisis.service.js";

/**
 * Check-in de 3–5 perguntas (secção 1). Determina QUAL template é usado,
 * nunca que conteúdo clínico é gerado.
 */
export interface CheckInSubmission {
  userId: string;
  locale: string;
  requestedGoal: ClinicalGoal;
  /** Q2 — texto livre, sempre avaliado pelo classificador de crise. */
  recentFeelingText: string;
  /** Q3 — texto livre opcional, torna-se a nota de situação na personalização. */
  situationNote?: string;
  /** Q4 — escala fechada, nunca texto livre; não passa pelo classificador. */
  energyLevel: 1 | 2 | 3 | 4 | 5;
  /** Q5 — texto livre opcional, sempre avaliado pelo classificador de crise. */
  additionalNote?: string;
}

export type CheckInOutcome =
  | {
      kind: "crisis_clear";
      response: CrisisResponseBundle;
      noRealTimeSupervisionNotice: string;
    }
  | {
      kind: "crisis_ambiguous";
      checkInId: string;
      response: CrisisResponseBundle;
      noRealTimeSupervisionNotice: string;
      acknowledgement: string;
    }
  | {
      kind: "crisis_needs_clarification";
      checkInId: string;
      response: CrisisResponseBundle;
      noRealTimeSupervisionNotice: string;
      clarification: CrisisClarificationPrompt;
    }
  | { kind: "no_template_available"; checkInId: string; availableGoals: ClinicalGoal[] }
  | {
      kind: "matched";
      checkInId: string;
      templateVersionId: string;
      templateTitle: string;
      clinicalGoal: ClinicalGoal;
      /**
       * Opções de ritmo fechadas do template correspondido — expostas para
       * que o ecrã de personalização possa oferecer escolha, sem expor
       * indução/sugestões centrais/frases-âncora (conteúdo clínico só sai
       * do backend já dentro do texto renderizado da sessão).
       */
      paceOptions: string[];
    };

export function freeTextAnswers(submission: CheckInSubmission): string[] {
  return [
    submission.recentFeelingText,
    submission.situationNote ?? "",
    submission.additionalNote ?? "",
  ];
}

export interface StoredCrisisContext {
  level: CrisisLevel;
}
