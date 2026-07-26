/**
 * Léxico de arranque para o classificador heurístico de crise (PT-PT),
 * estruturado segundo as dimensões do C-SSRS / Columbia Protocol
 * (Columbia-Suicide Severity Rating Scale) — o instrumento com mais
 * validação empírica publicada para rastreio de risco suicida — em vez de
 * uma lista de palavras-chave livre a crescer indefinidamente.
 *
 * IMPORTANTE — ver docs/crisis-detection.md: isto é uma estrutura de
 * arranque a validar com parecer clínico antes de qualquer lançamento, não
 * uma implementação certificada do C-SSRS completo (que é um instrumento
 * de entrevista clínica, não um classificador de texto automático). O que
 * se importa aqui é a lógica de organização por dimensão de risco —
 * ideação passiva, ideação ativa, plano, intenção, comportamento
 * preparatório — não o texto exato de cada frase, que precisa de expansão
 * e revisão clínica contínua.
 *
 * Mapeamento de severidade (ver crisis.types.ts e heuristic-crisis-classifier.ts):
 *   - IDEATION_PASSIVE  → nível AMBÍGUO (desejo de morrer/desistir sem
 *     ideação suicida ativa — corresponde a C-SSRS item 1).
 *   - IDEATION_ACTIVE, PLAN, INTENT, PREPARATORY_BEHAVIOR → nível CLARO
 *     (ideação suicida ativa ou qualquer indicador de plano, intenção ou
 *     comportamento preparatório — corresponde a C-SSRS itens 2–5 e à
 *     secção de comportamento).
 */

export type CrisisDimension =
  | "IDEATION_PASSIVE"
  | "IDEATION_ACTIVE"
  | "PLAN"
  | "INTENT"
  | "PREPARATORY_BEHAVIOR";

export interface LexiconEntry {
  pattern: string;
  dimension: CrisisDimension;
  regex: RegExp;
}

function toEntry(pattern: string, dimension: CrisisDimension): LexiconEntry {
  const escaped = pattern
    .split(/\s+/)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("\\s+\\w*\\s*");
  return { pattern, dimension, regex: new RegExp(escaped, "i") };
}

// --- Ideação passiva (C-SSRS item 1): desejo de estar morto/de desistir,
// sem pensamentos ativos de se matar. Comum em PT/PALOP como eufemismo,
// minimização ou metáfora de exaustão extrema.
const IDEATION_PASSIVE: LexiconEntry[] = [
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
].map((p) => toEntry(p, "IDEATION_PASSIVE"));

// --- Ideação ativa (C-SSRS itens 2–3): pensamentos ativos de se matar,
// com ou sem método, sem plano específico ainda articulado.
const IDEATION_ACTIVE: LexiconEntry[] = [
  "quero morrer",
  "quero suicidar",
  "penso em suicídio",
  "penso em tirar a minha vida",
  "quero acabar com a minha vida",
  "quero acabar com tudo",
  "não aguento mais viver",
  "não quero continuar vivo",
  "não quero continuar viva",
  "queria desaparecer para sempre",
].map((p) => toEntry(p, "IDEATION_ACTIVE"));

// --- Plano (C-SSRS item 4): método e/ou momento específico considerado.
const PLAN: LexiconEntry[] = [
  "já tenho um plano para morrer",
  "já sei como o vou fazer",
  "já escolhi como me vou matar",
].map((p) => toEntry(p, "PLAN"));

// --- Intenção (C-SSRS item 5): intenção explícita de agir.
const INTENT: LexiconEntry[] = [
  "vou suicidar-me",
  "vou-me matar",
  "vou matar-me",
].map((p) => toEntry(p, "INTENT"));

// --- Comportamento preparatório (C-SSRS — secção de comportamento):
// meios já obtidos, ensaio, ou outros preparativos concretos.
const PREPARATORY_BEHAVIOR: LexiconEntry[] = [
  "tenho os comprimidos guardados",
  "já guardei o suficiente de comprimidos",
  "ando a magoar-me de propósito",
  "quero cortar-me",
].map((p) => toEntry(p, "PREPARATORY_BEHAVIOR"));

export const CLEAR_DIMENSION_ENTRIES: LexiconEntry[] = [
  ...IDEATION_ACTIVE,
  ...PLAN,
  ...INTENT,
  ...PREPARATORY_BEHAVIOR,
];

export const AMBIGUOUS_DIMENSION_ENTRIES: LexiconEntry[] = [...IDEATION_PASSIVE];

export function findMatch(
  entries: LexiconEntry[],
  normalizedText: string,
): LexiconEntry | undefined {
  return entries.find((entry) => entry.regex.test(normalizedText));
}
