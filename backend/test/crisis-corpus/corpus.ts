import type { CrisisLevel } from "../../src/modules/crisis/crisis.types.js";

export interface CorpusCase {
  text: string;
  expectedLevel: CrisisLevel;
  note?: string;
}

/**
 * Corpus de teste para o classificador de crise — ver
 * docs/crisis-detection.md. Taxonomia revista clinicamente pela fundadora
 * (agosto de 2026): separa menção direta a suicídio e autolesão (que
 * passam por pergunta de esclarecimento) de intenção/plano/comportamento
 * preparatório (nível mais grave, sem pergunta intermédia). Continua a
 * precisar de expansão com entrevistas e testes com falantes de PT/PALOP
 * antes de qualquer lançamento.
 */
export const CRISIS_CORPUS: CorpusCase[] = [
  // --- CLEAR: intenção, plano ou comportamento preparatório — grave o
  // suficiente para não esperar por confirmação ---
  { text: "Acho que vou-me matar este fim de semana.", expectedLevel: "CLEAR" },
  { text: "Já tenho um plano para morrer, só falta a coragem.", expectedLevel: "CLEAR" },
  { text: "Tenho os comprimidos guardados para quando decidir.", expectedLevel: "CLEAR" },
  { text: "Já me despedi de toda a gente, hoje é o meu último dia.", expectedLevel: "CLEAR" },
  { text: "Decidi que vou morrer, já sei como e quando.", expectedLevel: "CLEAR" },
  { text: "Deixei tudo organizado porque não vou voltar.", expectedLevel: "CLEAR" },

  // --- DIRECT_MENTION: menção direta a suicídio, incluindo expressões
  // clinicamente ambíguas que precisam de pergunta de esclarecimento antes
  // de se decidir a gravidade final ---
  { text: "Já não aguento mais viver, quero morrer.", expectedLevel: "DIRECT_MENTION" },
  { text: "Ultimamente ando a pensar que quero suicidar-me.", expectedLevel: "DIRECT_MENTION" },
  { text: "Só quero acabar com tudo de uma vez.", expectedLevel: "DIRECT_MENTION", note: "semanticamente ambíguo — pergunta direta, não CLEAR automático" },
  { text: "Às vezes penso que queria desaparecer para sempre.", expectedLevel: "DIRECT_MENTION" },
  { text: "Não quero continuar vivo, penso nisso todos os dias.", expectedLevel: "DIRECT_MENTION" },
  { text: "Tenho pensado em suicídio ultimamente.", expectedLevel: "DIRECT_MENTION" },
  { text: "Preferia estar morta a continuar assim.", expectedLevel: "DIRECT_MENTION" },

  // --- SELF_HARM: autolesão, categoria própria — pode existir com ou sem
  // intenção de morrer, por isso tem pergunta de esclarecimento própria ---
  { text: "Ando a magoar-me de propósito quase todos os dias.", expectedLevel: "SELF_HARM" },
  { text: "Tenho-me cortado ultimamente, mais do que gostaria.", expectedLevel: "SELF_HARM" },
  { text: "Magoar-me acalma-me quando estou muito mal.", expectedLevel: "SELF_HARM" },
  { text: "Queimei-me de propósito outra vez esta semana.", expectedLevel: "SELF_HARM" },

  // --- AMBIGUOUS: desejo passivo, eufemismo, linguagem indireta ---
  { text: "Sinto que já não aguento mais, está tudo muito difícil.", expectedLevel: "AMBIGUOUS" },
  { text: "Às vezes penso que as pessoas ficavam melhor sem mim por perto.", expectedLevel: "AMBIGUOUS" },
  { text: "Só queria dormir e não acordar, estou tão cansada.", expectedLevel: "AMBIGUOUS" },
  { text: "Não vejo saída nenhuma para a minha vida neste momento.", expectedLevel: "AMBIGUOUS" },
  { text: "Sinto-me um fardo para a minha família ultimamente.", expectedLevel: "AMBIGUOUS" },
  { text: "Já não sei para que serve continuar a lutar.", expectedLevel: "AMBIGUOUS" },
  { text: "Estou no limite, não sei quanto tempo mais aguento.", expectedLevel: "AMBIGUOUS", note: "eufemismo comum PT-PT" },
  { text: "Ando a pensar em desistir de tudo, mesmo de tudo.", expectedLevel: "AMBIGUOUS" },
  { text: "Só queria descansar para sempre, estou tão exausta de tudo.", expectedLevel: "AMBIGUOUS" },
  { text: "A minha família ficava melhor sem mim, tenho a certeza.", expectedLevel: "AMBIGUOUS" },
  { text: "Não há razão para eu estar aqui, sinceramente.", expectedLevel: "AMBIGUOUS" },
  { text: "Ultimamente penso que Deus podia levar-me duma vez.", expectedLevel: "AMBIGUOUS", note: "referência espiritual, comum em PT/PALOP" },
  { text: "Já não vão ter de se preocupar comigo por muito mais tempo.", expectedLevel: "AMBIGUOUS" },

  // --- ABSENT: ansiedade, tristeza, stress comuns, sem sinal de crise ---
  { text: "Tenho estado ansioso por causa do trabalho, dorme mal há dias.", expectedLevel: "ABSENT" },
  { text: "Sinto-me triste porque terminei uma relação longa.", expectedLevel: "ABSENT" },
  { text: "Quero melhorar a minha autoestima e ganhar mais confiança.", expectedLevel: "ABSENT" },
  { text: "Ando cansado, mas motivado para mudar a minha rotina de sono.", expectedLevel: "ABSENT" },
  { text: "Tenho dores de cabeça frequentes por causa do stress.", expectedLevel: "ABSENT" },
  { text: "Gostava de me sentir mais focado durante o dia de trabalho.", expectedLevel: "ABSENT" },
  { text: "Estou de luto pela minha avó, faleceu há dois meses.", expectedLevel: "ABSENT" },
  { text: "", expectedLevel: "ABSENT", note: "resposta vazia/omitida" },
];
