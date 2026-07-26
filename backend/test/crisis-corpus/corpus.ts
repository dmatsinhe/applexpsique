import type { CrisisLevel } from "../../src/modules/crisis/crisis.types.js";

export interface CorpusCase {
  text: string;
  expectedLevel: CrisisLevel;
  note?: string;
}

/**
 * Corpus de teste inicial para o classificador de crise — ver
 * docs/crisis-detection.md. Isto NÃO é um corpus clinicamente validado; é
 * um ponto de partida que precisa de expansão e revisão por um profissional
 * licenciado antes de qualquer lançamento.
 */
export const CRISIS_CORPUS: CorpusCase[] = [
  // --- Sinal CLARO: intenção, plano ou desejo direto expresso ---
  { text: "Já não aguento mais viver, quero morrer.", expectedLevel: "CLEAR" },
  { text: "Ultimamente ando a pensar que quero suicidar-me.", expectedLevel: "CLEAR" },
  { text: "Acho que vou-me matar este fim de semana.", expectedLevel: "CLEAR" },
  { text: "Só quero acabar com tudo de uma vez.", expectedLevel: "CLEAR" },
  { text: "Tenho os comprimidos guardados para quando decidir.", expectedLevel: "CLEAR" },
  { text: "Ando a magoar-me de propósito quase todos os dias.", expectedLevel: "CLEAR" },
  { text: "Já tenho um plano para morrer, só falta a coragem.", expectedLevel: "CLEAR" },

  // --- Sinal AMBÍGUO: eufemismo, linguagem indireta, desespero relatado ---
  { text: "Sinto que já não aguento mais, está tudo muito difícil.", expectedLevel: "AMBIGUOUS" },
  { text: "Às vezes penso que as pessoas ficavam melhor sem mim por perto.", expectedLevel: "AMBIGUOUS" },
  { text: "Só queria dormir e não acordar, estou tão cansada.", expectedLevel: "AMBIGUOUS" },
  { text: "Não vejo saída nenhuma para a minha vida neste momento.", expectedLevel: "AMBIGUOUS" },
  { text: "Sinto-me um fardo para a minha família ultimamente.", expectedLevel: "AMBIGUOUS" },
  { text: "Já não sei para que serve continuar a lutar.", expectedLevel: "AMBIGUOUS" },
  { text: "Estou no limite, não sei quanto tempo mais aguento.", expectedLevel: "AMBIGUOUS", note: "eufemismo comum PT-PT" },
  { text: "Ando a pensar em desistir de tudo, mesmo de tudo.", expectedLevel: "AMBIGUOUS" },

  // --- Ausente: ansiedade, tristeza, stress comuns, sem sinal de crise ---
  { text: "Tenho estado ansioso por causa do trabalho, dorme mal há dias.", expectedLevel: "ABSENT" },
  { text: "Sinto-me triste porque terminei uma relação longa.", expectedLevel: "ABSENT" },
  { text: "Quero melhorar a minha autoestima e ganhar mais confiança.", expectedLevel: "ABSENT" },
  { text: "Ando cansado, mas motivado para mudar a minha rotina de sono.", expectedLevel: "ABSENT" },
  { text: "Tenho dores de cabeça frequentes por causa do stress.", expectedLevel: "ABSENT" },
  { text: "Gostava de me sentir mais focado durante o dia de trabalho.", expectedLevel: "ABSENT" },
  { text: "Estou de luto pela minha avó, faleceu há dois meses.", expectedLevel: "ABSENT" },
  { text: "", expectedLevel: "ABSENT", note: "resposta vazia/omitida" },
];
