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
  /**
   * Autorrelato de contraindicações (secção 1, revisão de Ansiedade
   * generalizada): só perguntado quando `requestedGoal` exige triagem
   * prévia que a app não tem meios de fazer clinicamente (sem profissional
   * no circuito). `true` = a pessoa reportou pelo menos uma
   * contraindicação; a sessão é recusada, nunca gerada mesmo assim.
   */
  contraindicationSelfReport?: boolean;
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
      kind: "contraindication_flagged";
      checkInId: string;
      response: CrisisResponseBundle;
      message: string;
    }
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

export interface ContraindicationScreening {
  /** Pergunta de autorrelato mostrada no check-in para este objetivo. */
  question: string;
  /** Mensagem mostrada quando a pessoa reporta a contraindicação. */
  message: string;
}

/**
 * Objetivos cujo guião clínico real pressupõe triagem prévia por um
 * profissional (mania, psicose, perturbação alimentar, trauma
 * descompensado, etc.) que a app não tem meios de fazer — substituída por
 * autorrelato direto no check-in. Cada objetivo tem a sua própria pergunta
 * e mensagem, porque as contraindicações de cada guião são diferentes.
 * Nunca crescer este mapa silenciosamente: só quando o guião real de um
 * objetivo o exigir explicitamente. Tem de espelhar o mapa equivalente em
 * frontend/src/pages/CheckIn.tsx.
 */
export const CONTRAINDICATION_SCREENING: Partial<Record<ClinicalGoal, ContraindicationScreening>> = {
  GENERALIZED_ANXIETY: {
    question:
      "Alguma vez foi diagnosticado(a) com mania, psicose ou perturbação dissociativa, ou está " +
      "atualmente numa crise que exige apoio imediato?",
    message:
      "Este exercício de hipnose autoguiada não é recomendado para quem tem diagnóstico de mania, " +
      "psicose ou perturbação dissociativa, ou está a viver uma crise que exige apoio imediato. " +
      "Por isso não fica disponível agora. Os recursos abaixo podem ajudar a encontrar o apoio " +
      "profissional adequado.",
  },
  SELF_ESTEEM: {
    question:
      "Está atualmente a viver violência, uma perturbação alimentar, depressão grave, ou um trauma " +
      "não resolvido/descompensado?",
    message:
      "Este exercício de autoestima não fica disponível enquanto houver violência atual, uma " +
      "perturbação alimentar, depressão grave ou trauma descompensado — estas situações exigem " +
      "avaliação e intervenção profissional, não um exercício autoguiado. Os recursos abaixo podem " +
      "ajudar a encontrar o apoio profissional adequado.",
  },
};

export const GOALS_REQUIRING_CONTRAINDICATION_SCREENING: ClinicalGoal[] = Object.keys(
  CONTRAINDICATION_SCREENING,
) as ClinicalGoal[];

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
