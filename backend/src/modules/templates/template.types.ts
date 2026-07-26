export const CLINICAL_GOALS = [
  "SLEEP",
  "GENERALIZED_ANXIETY",
  "FOCUS",
  "SELF_ESTEEM",
  "HABIT",
  "PAIN",
  "GRIEF",
] as const;
export type ClinicalGoal = (typeof CLINICAL_GOALS)[number];

export const TEMPLATE_STATUSES = ["DRAFT", "APPROVED", "RETIRED"] as const;
export type TemplateStatus = (typeof TEMPLATE_STATUSES)[number];

/**
 * Corpo estruturado de um template. Ver docs/database-schema.md.
 *
 * `induction`, `coreSuggestions`, `anchorPhrases` e `closing` são
 * inteiramente fixos — escritos e aprovados pela fundadora, nunca tocados
 * pela camada de personalização.
 *
 * `personalizableOpening` é a ÚNICA frase com placeholders (`{{nome}}`,
 * `{{situacao}}`) — o texto à volta dos placeholders também é escrito e
 * aprovado pela fundadora; a personalização só substitui os tokens, nunca
 * reescreve a frase.
 *
 * `paceOptions` e `anchorPhrases` são catálogos fechados: a personalização
 * pode ESCOLHER de entre eles (ritmo, quais frases-âncora enfatizar), nunca
 * inventar uma opção nova.
 */
export interface TemplateContent {
  induction: string;
  coreSuggestions: string[];
  anchorPhrases: string[];
  closing: string;
  personalizableOpening: string;
  paceOptions: string[];
}

export interface PersonalizableFieldsFlags {
  nameSlot: boolean;
  situationSlot: boolean;
  paceDirectiveSlot: boolean;
}
