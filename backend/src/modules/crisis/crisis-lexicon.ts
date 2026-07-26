/**
 * Léxico de arranque para o classificador heurístico de crise (PT-PT).
 *
 * IMPORTANTE — ver docs/crisis-detection.md: este léxico é um ponto de
 * partida de engenharia, não um classificador clinicamente validado. Antes
 * de qualquer lançamento, a secção 5 do briefing exige: (1) um corpus de
 * teste maior e revisto clinicamente, (2) uma taxa de falsos negativos
 * medida explicitamente, (3) um limiar mínimo aceitável definido por
 * critério clínico, não de engenharia. Este ficheiro não substitui esse
 * trabalho — dá ao classificador algo para correr enquanto esse trabalho
 * não está feito, e ao pipeline de teste algo para medir.
 *
 * Frases organizadas por nível de sinal. Normalização aplicada antes da
 * comparação: minúsculas, sem acentuação redundante de espaços, mas os
 * acentos portugueses são mantidos porque mudam o significado.
 */

export interface LexiconEntry {
  pattern: string;
  /** Regex de palavra-a-palavra tolerante a pequenas variações morfológicas. */
  regex: RegExp;
}

function toEntry(pattern: string): LexiconEntry {
  const escaped = pattern
    .split(/\s+/)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("\\s+\\w*\\s*");
  return { pattern, regex: new RegExp(escaped, "i") };
}

// Sinal CLARO — intenção, plano ou desejo direto de morrer/autolesão.
export const CLEAR_PHRASES: LexiconEntry[] = [
  "quero morrer",
  "quero suicidar",
  "vou suicidar-me",
  "vou-me matar",
  "vou matar-me",
  "quero acabar com a minha vida",
  "quero acabar com tudo",
  "não aguento mais viver",
  "não quero continuar vivo",
  "não quero continuar viva",
  "penso em suicídio",
  "penso em tirar a minha vida",
  "já tenho um plano para morrer",
  "quero cortar-me",
  "ando a magoar-me de propósito",
  "queria desaparecer para sempre",
  "tenho os comprimidos guardados",
].map(toEntry);

// Sinal AMBÍGUO — linguagem indireta, eufemismos, desespero relatado sem
// intenção/plano explícito. Comum em PT/PALOP: minimização, metáforas de
// cansaço extremo, referências a "descansar" ou "parar" como eufemismo.
export const AMBIGUOUS_PHRASES: LexiconEntry[] = [
  "não aguento mais",
  "não aguento mais nada",
  "estou farto de tudo",
  "estou farta de tudo",
  "as pessoas ficavam melhor sem mim",
  "toda a gente ficava melhor sem mim",
  "não vejo saída",
  "não vejo solução para isto",
  "estou no limite",
  "já não sei para que serve continuar",
  "sinto que sou um peso",
  "sinto-me um fardo",
  "queria só dormir e não acordar",
  "dormir e não acordar",
  "só queria parar de sentir",
  "ando a pensar em desistir de tudo",
  "já não faço falta a ninguém",
  "estava tudo mais calmo se eu não estivesse cá",
  "não vale a pena continuar",
  "já não vejo sentido em nada",
].map(toEntry);

export function findMatch(
  entries: LexiconEntry[],
  normalizedText: string,
): LexiconEntry | undefined {
  return entries.find((entry) => entry.regex.test(normalizedText));
}
