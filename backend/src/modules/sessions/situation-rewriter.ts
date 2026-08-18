import Anthropic from "@anthropic-ai/sdk";
import { env } from "../../config/env.js";

const MODEL = "claude-haiku-4-5-20251001";
const MAX_OUTPUT_LENGTH = 200;
const TIMEOUT_MS = 6000;

const SYSTEM_PROMPT =
  "Reescreves, em português, a frase que uma pessoa escreveu sobre a sua " +
  "situação, para soar mais suave e clara quando for lida em voz alta no " +
  "início de uma sessão de hipnoterapia. Regras absolutas: nunca acrescentas " +
  "informação, conselhos, diagnósticos, opiniões, nem interpretações que a " +
  "pessoa não tenha escrito. Nunca minimizas nem dramatizas o que foi dito. " +
  "Mantém sempre o mesmo sentido, só melhoras a fluidez. Resposta em no " +
  "máximo 20 palavras, só a frase reescrita, sem aspas, sem explicações, " +
  "sem introduções.";

/**
 * Personalização por IA (secção 4, "Como isto funciona"): a ÚNICA coisa que
 * este módulo tem permissão para fazer é parafrasear o que a própria pessoa
 * já escreveu no placeholder de situação — nunca gera conteúdo novo, nunca
 * toca em secções, indução, frases-âncora ou fecho. Falha sempre em
 * segurança: sem chave configurada, ou se a chamada à IA falhar/demorar
 * demasiado por qualquer razão, devolve o texto original tal como está —
 * nunca bloqueia a criação da sessão à espera da IA.
 */
export class SituationRewriter {
  private readonly client: Anthropic | null;

  constructor(client?: Anthropic | null) {
    this.client = client !== undefined ? client : env.anthropicApiKey ? new Anthropic({ apiKey: env.anthropicApiKey }) : null;
  }

  async rewrite(situation: string): Promise<string> {
    const trimmed = situation.trim();
    if (!this.client || trimmed.length === 0) return situation;

    try {
      const response = await this.client.messages.create(
        {
          model: MODEL,
          max_tokens: 120,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: trimmed }],
        },
        { timeout: TIMEOUT_MS },
      );

      const block = response.content[0];
      if (!block || block.type !== "text") return situation;

      const rewritten = block.text
        .replace(/\{\{|\}\}/g, "")
        .trim()
        .slice(0, MAX_OUTPUT_LENGTH);

      return rewritten.length > 0 ? rewritten : situation;
    } catch {
      return situation;
    }
  }
}
