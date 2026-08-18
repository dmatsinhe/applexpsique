import type { ActiveTemplateVersion } from "../templates/template.repository.js";
import type { PersonalizationInput, RenderedSession } from "./personalization.types.js";
import { SituationRewriter } from "./situation-rewriter.js";

const MAX_FREE_TEXT_LENGTH = 200;

/**
 * Remove qualquer sintaxe de placeholder do input do utilizador antes de o
 * inserir no template, para que nome/situação nunca possam ser usados para
 * injetar um segundo placeholder ou alterar a estrutura do texto aprovado.
 */
function sanitizeFreeText(value: string): string {
  return value
    .replace(/\{\{|\}\}/g, "")
    .trim()
    .slice(0, MAX_FREE_TEXT_LENGTH);
}

/**
 * A ÚNICA função com permissão para produzir o texto final de uma sessão.
 * Nunca chama um modelo de geração livre — apenas substitui tokens
 * explícitos dentro de texto já escrito e aprovado, e escolhe de entre
 * opções fechadas (ritmo, frases-âncora). Ver secção 1 do briefing:
 * "nunca a estrutura terapêutica, a técnica de indução, nem as sugestões
 * centrais".
 */
export class PersonalizationService {
  constructor(private readonly situationRewriter: SituationRewriter = new SituationRewriter()) {}

  /**
   * useAiPersonalization só deve vir true para utilizadoras Premium (ver
   * SessionService.createFromMatchedTemplate) — Grátis nunca chama a IA,
   * mesmo que a chave esteja configurada.
   */
  async render(
    template: ActiveTemplateVersion,
    input: PersonalizationInput,
    useAiPersonalization: boolean = false,
  ): Promise<RenderedSession> {
    const { content } = template;

    if (!content.paceOptions.includes(input.pace)) {
      throw new Error(
        `Ritmo "${input.pace}" não é uma opção permitida para este template. Opções: ${content.paceOptions.join(", ")}`,
      );
    }

    const emphasized = input.emphasizedAnchorPhrases ?? content.anchorPhrases;
    const invalidPhrases = emphasized.filter((phrase) => !content.anchorPhrases.includes(phrase));
    if (invalidPhrases.length > 0) {
      throw new Error(
        `Frases-âncora não reconhecidas para este template (não podem ser inventadas): ${invalidPhrases.join(", ")}`,
      );
    }

    const name = sanitizeFreeText(input.name || "");
    let situation = sanitizeFreeText(input.situationNote || "o que o trouxe até aqui");

    if (name.length === 0) {
      throw new Error("Nome é obrigatório para personalizar a sessão.");
    }

    if (useAiPersonalization) {
      const rewritten = await this.situationRewriter.rewrite(situation);
      situation = sanitizeFreeText(rewritten);
    }

    const opening = content.personalizableOpening
      .replaceAll("{{nome}}", name)
      .replaceAll("{{situacao}}", situation);

    return {
      opening,
      sections: content.sections,
      emphasizedAnchorPhrases: emphasized,
      closing: content.closing,
      pace: input.pace,
    };
  }
}
