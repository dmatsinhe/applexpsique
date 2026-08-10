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
 * Uma fase nomeada e ordenada do guião clínico (ex.: preparação, indução,
 * aprofundamento, redução do esforço, imagem de segurança, reformulação,
 * sugestões pós-hipnóticas, ensaio mental, regresso). Corpo inteiramente
 * fixo — a ordem e o texto de cada secção são exatamente os escritos e
 * aprovados pela fundadora, nunca reagrupados nem reescritos pela app.
 */
export interface TemplateSection {
  id: string;
  title: string;
  body: string;
}

/**
 * Corpo estruturado de um template. Ver docs/database-schema.md.
 *
 * `sections`, `anchorPhrases` e `closing` são inteiramente fixos — escritos
 * e aprovados pela fundadora, nunca tocados pela camada de personalização.
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
  personalizableOpening: string;
  sections: TemplateSection[];
  anchorPhrases: string[];
  closing: string;
  paceOptions: string[];
}

export interface PersonalizableFieldsFlags {
  nameSlot: boolean;
  situationSlot: boolean;
  paceDirectiveSlot: boolean;
}
