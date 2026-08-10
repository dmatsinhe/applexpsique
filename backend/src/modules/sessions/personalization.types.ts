import type { TemplateSection } from "../templates/template.types.js";

/**
 * Únicos campos que a personalização pode preencher (secção 1): nome,
 * situação específica, ritmo, e quais frases-âncora (já escritas e
 * aprovadas) enfatizar. Nunca estrutura, secções, ou o texto dentro delas.
 */
export interface PersonalizationInput {
  name: string;
  situationNote?: string;
  /** Tem de ser um dos `paceOptions` do template — nunca texto livre. */
  pace: string;
  /** Subconjunto de `anchorPhrases` do template — nunca frases novas. */
  emphasizedAnchorPhrases?: string[];
}

export interface RenderedSession {
  opening: string;
  sections: TemplateSection[];
  emphasizedAnchorPhrases: string[];
  closing: string;
  pace: string;
}
