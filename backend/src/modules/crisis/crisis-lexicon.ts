/**
 * Léxico do classificador de crise (PT-PT), revisto clinicamente pela
 * fundadora (agosto de 2026) sobre a estrutura inicial inspirada no
 * C-SSRS/Columbia Protocol.
 *
 * A revisão corrigiu uma simplificação da primeira versão: agrupar
 * "ideação", "intenção", "plano", "preparação" e "autolesão" no mesmo
 * nível clínico perde distinções importantes. A estrutura atual separa:
 *
 *   - IDEATION_PASSIVE — desejo passivo de morrer/desistir, eufemismos,
 *     sem menção direta a suicídio. → nível AMBIGUOUS.
 *   - IDEATION_DIRECT — menção direta a suicídio ("quero morrer", "penso
 *     em suicídio"), incluindo expressões "semanticamente ambíguas" como
 *     "quero acabar com tudo" que parecem graves mas não provam, por si
 *     só, intenção imediata. → nível DIRECT_MENTION: pergunta de
 *     esclarecimento automatizada antes de decidir a gravidade final.
 *   - SELF_HARM — autolesão atual ou desejada, distinta de ideação
 *     suicida (pode existir com ou sem intenção de morrer). → nível
 *     SELF_HARM: pergunta de esclarecimento própria.
 *   - INTENT, PLAN, PREPARATORY_BEHAVIOR — intenção declarada, plano
 *     concreto, ou comportamento de despedida/preparação. → nível CLEAR
 *     diretamente, sem pergunta intermédia: aqui a combinação já é
 *     suficientemente grave para não esperar por confirmação.
 *
 * IMPORTANTE — ver docs/crisis-detection.md: continua a ser um léxico de
 * arranque, não uma validação clínica completa. A fundadora reviu a
 * estrutura e corrigiu a taxonomia; o corpus continua a precisar de
 * expansão com entrevistas e testes com falantes de PT/PALOP antes de
 * qualquer lançamento.
 */

export type CrisisDimension =
  | "IDEATION_PASSIVE"
  | "IDEATION_DIRECT"
  | "SELF_HARM"
  | "INTENT"
  | "PLAN"
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

// --- Ideação passiva: desejo de estar morto/de desistir, sem menção
// direta a suicídio. Eufemismos, minimização, referências espirituais —
// comuns em PT/PALOP. Inclui frases que se sobrepõem a risco de violência
// contra terceiros ("vou fazer uma loucura/desgraça") — tratadas aqui por
// agora, mostrando sempre os mesmos recursos (o 112 já cobre emergência
// geral); podem justificar categoria própria mais tarde, com casos reais.
const IDEATION_PASSIVE: LexiconEntry[] = [
  "não aguento mais",
  "não aguento mais nada",
  "estou farto de tudo",
  "estou farta de tudo",
  "as pessoas ficavam melhor sem mim",
  "toda a gente ficava melhor sem mim",
  "a minha família ficava melhor sem mim",
  "não vejo saída",
  "não vejo solução para isto",
  "estou no limite",
  "já não sei para que serve continuar",
  "sinto que sou um peso",
  "sinto-me um fardo",
  "queria só dormir e não acordar",
  "queria adormecer e não acordar",
  "dormir e não acordar",
  "só queria parar de sentir",
  "ando a pensar em desistir de tudo",
  "já não faço falta a ninguém",
  "estava tudo mais calmo se eu não estivesse cá",
  "não vale a pena continuar",
  "já não vejo sentido em nada",
  "deus podia levar-me",
  "só queria descansar para sempre",
  "queria partir de vez",
  "qualquer dia desapareço daqui",
  "um dia destes acabo comigo",
  "não quero ver o dia de amanhã",
  "já vivi o que tinha para viver",
  "não há razão para eu estar aqui",
  "não vão ter de se preocupar comigo por muito mais tempo",
  "em breve isto tudo acaba",
  "vou fazer uma loucura",
  "vou fazer uma desgraça comigo",
].map((p) => toEntry(p, "IDEATION_PASSIVE"));

// --- Menção direta a suicídio. Inclui expressões clinicamente ambíguas
// ("quero acabar com tudo", "queria desaparecer para sempre") que a
// fundadora identificou como precisando de pergunta direta em vez de
// classificação automática como o nível mais grave.
const IDEATION_DIRECT: LexiconEntry[] = [
  "quero morrer",
  "quero suicidar-me",
  "penso em matar-me",
  "penso em suicídio",
  "tenho pensado em suicídio",
  "penso em tirar a minha vida",
  "não quero continuar vivo",
  "não quero continuar viva",
  "preferia estar morto",
  "preferia estar morta",
  "estou a pensar em acabar com a minha vida",
  "quero acabar com a minha vida",
  "não aguento mais viver",
  "quero acabar com tudo",
  "queria desaparecer para sempre",
].map((p) => toEntry(p, "IDEATION_DIRECT"));

// --- Autolesão — categoria própria, distinta de ideação suicida: pode
// existir com ou sem intenção de morrer, por isso tem pergunta de
// esclarecimento própria ("querias morrer, não querias, ou não tinhas a
// certeza?"), nunca tratada como sinónimo de risco suicida direto.
const SELF_HARM: LexiconEntry[] = [
  "ando a magoar-me de propósito",
  "quero cortar-me",
  "tenho-me cortado",
  "magoar-me acalma-me",
  "tenho vontade de me ferir",
  "queimei-me de propósito",
  "não queria morrer queria parar a dor",
].map((p) => toEntry(p, "SELF_HARM"));

// --- Intenção declarada: decisão verbalizada de morrer, sem necessariamente
// especificar método/momento (isso é PLAN).
const INTENT: LexiconEntry[] = [
  "vou suicidar-me",
  "vou-me matar",
  "vou matar-me",
  "decidi que vou morrer",
].map((p) => toEntry(p, "INTENT"));

// --- Plano concreto: método e/ou momento específico considerado.
const PLAN: LexiconEntry[] = [
  "já tenho um plano para morrer",
  "já sei como e quando",
  "tenho um plano e pretendo fazê-lo",
  "já escolhi como me vou matar",
].map((p) => toEntry(p, "PLAN"));

// --- Comportamento preparatório: meios obtidos, despedidas, organização
// final — sinais comportamentais de preparação, não só verbais.
// Nota (fundadora): "tenho os comprimidos guardados" só é comportamento
// preparatório quando associado a intenção suicida — um classificador de
// frases não distingue isso do contexto; mantém-se aqui pelo lado mais
// seguro (falso positivo custa só fricção), documentado como limitação.
const PREPARATORY_BEHAVIOR: LexiconEntry[] = [
  "tenho os comprimidos guardados",
  "já guardei o suficiente de comprimidos",
  "já preparei tudo",
  "já me despedi",
  "deixei tudo organizado porque não vou voltar",
  "hoje é o meu último dia",
  "esta pode ser a última vez que falamos",
  "cuida dos meus filhos se alguma coisa me acontecer",
  "já resolvi todos os meus problemas",
].map((p) => toEntry(p, "PREPARATORY_BEHAVIOR"));

export const CLEAR_DIMENSION_ENTRIES: LexiconEntry[] = [
  ...INTENT,
  ...PLAN,
  ...PREPARATORY_BEHAVIOR,
];

export const SELF_HARM_DIMENSION_ENTRIES: LexiconEntry[] = [...SELF_HARM];

export const DIRECT_MENTION_DIMENSION_ENTRIES: LexiconEntry[] = [...IDEATION_DIRECT];

export const AMBIGUOUS_DIMENSION_ENTRIES: LexiconEntry[] = [...IDEATION_PASSIVE];

export function findMatch(
  entries: LexiconEntry[],
  normalizedText: string,
): LexiconEntry | undefined {
  return entries.find((entry) => entry.regex.test(normalizedText));
}
