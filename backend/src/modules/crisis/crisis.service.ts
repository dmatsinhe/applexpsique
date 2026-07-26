import { HeuristicCrisisClassifier } from "./heuristic-crisis-classifier.js";
import { mostSevere, type ClassificationResult, type CrisisClassifier } from "./crisis.types.js";
import { getCrisisResourcesForLocale, type CrisisResource } from "./crisis-resources.js";
import { recordCrisisEvent } from "./crisis-audit.repository.js";

export interface CrisisCheckOutcome {
  result: ClassificationResult;
  resources: CrisisResource[] | null;
  /**
   * Texto de reconhecimento explícito — obrigatório antes de oferecer
   * continuar em nível AMBIGUOUS (secção 5: "nunca decide sozinho que está
   * tudo bem"). Nunca contém aconselhamento — só reconhecimento + recursos.
   */
  acknowledgement: string | null;
  /** Se true, o fluxo automatizado tem de parar aqui — nunca oferecer sessão. */
  blocksSession: boolean;
}

const AMBIGUOUS_ACKNOWLEDGEMENT =
  "Notámos algo no que escreveu que nos preocupa. Não vamos ignorar isso, " +
  "e também não vamos assumir que sabemos o que se passa. Aqui estão " +
  "recursos de apoio — a decisão de continuar é sua.";

export class CrisisService {
  constructor(
    private readonly classifier: CrisisClassifier = new HeuristicCrisisClassifier(),
  ) {}

  /**
   * Corre o classificador sobre cada texto livre fornecido (secção 5:
   * "cada input do check-in e cada mensagem livre do utilizador"), combina
   * pelo nível mais severo, regista o evento de auditoria, e devolve a
   * decisão pronta para a API expor — nunca aconselha, só mostra recursos.
   */
  async evaluate(params: {
    userId?: string;
    texts: string[];
    source: "checkin" | "free_message";
    locale: string;
  }): Promise<CrisisCheckOutcome> {
    const nonEmptyTexts = params.texts.filter((t) => t.trim().length > 0);

    const results =
      nonEmptyTexts.length > 0
        ? nonEmptyTexts.map((text) => this.classifier.classify(text))
        : [this.classifier.classify("")];

    const overall = mostSevere(results);

    await Promise.all(
      nonEmptyTexts.map((text, index) =>
        recordCrisisEvent({
          userId: params.userId,
          source: params.source,
          rawText: text,
          result: results[index],
        }),
      ),
    );

    if (overall.level === "ABSENT") {
      return { result: overall, resources: null, acknowledgement: null, blocksSession: false };
    }

    const resources = getCrisisResourcesForLocale(params.locale);

    if (overall.level === "CLEAR") {
      // "Para a sessão automatizada imediatamente, mostra recursos sem
      // fricção" — sem reconhecimento intermédio, sem oferta de continuar.
      return { result: overall, resources, acknowledgement: null, blocksSession: true };
    }

    // AMBIGUOUS: mostra recursos + reconhece o sinal explicitamente antes de
    // oferecer continuar. O caller decide separadamente se oferece a opção
    // de continuar depois de mostrar isto — nunca decidimos aqui.
    return {
      result: overall,
      resources,
      acknowledgement: AMBIGUOUS_ACKNOWLEDGEMENT,
      blocksSession: true,
    };
  }
}
