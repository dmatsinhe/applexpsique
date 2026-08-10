import { HeuristicCrisisClassifier } from "./heuristic-crisis-classifier.js";
import {
  mostSevere,
  needsClarification,
  type ClarificationLevel,
  type ClassificationResult,
  type CrisisClassifier,
  type CrisisLevel,
} from "./crisis.types.js";
import { getCrisisResponseBundleForLocale, type CrisisResponseBundle } from "./crisis-resources.js";
import { recordCrisisEvent } from "./crisis-audit.repository.js";

/**
 * Mostrada sempre que há sinal de risco (qualquer nível acima de ABSENT),
 * a par dos três blocos de recursos — nunca escondida atrás de um ecrã
 * genérico (secção 5, decisão revista): a app não promete nem tenta
 * oferecer supervisão humana em tempo real como parte do fluxo automático.
 */
const NO_REALTIME_SUPERVISION_NOTICE =
  "Esta aplicação não tem supervisão humana em tempo real. Ninguém é " +
  "notificado agora. Os recursos abaixo estão disponíveis a qualquer " +
  "hora — use-os se precisar de ajuda imediata.";

export type ClarificationResolution = "ESCALATE" | "DOWNGRADE";

export interface CrisisClarificationPrompt {
  level: ClarificationLevel;
  question: string;
  options: { label: string; resolution: ClarificationResolution }[];
}

export interface CrisisCheckOutcome {
  result: ClassificationResult;
  response: CrisisResponseBundle | null;
  noRealTimeSupervisionNotice: string | null;
  /**
   * Texto de reconhecimento explícito — mostrado em nível AMBIGUOUS, antes
   * de oferecer continuar (secção 5: "nunca decide sozinho que está tudo
   * bem"). Nunca contém aconselhamento — só reconhecimento + recursos.
   */
  acknowledgement: string | null;
  /**
   * Presente em DIRECT_MENTION/SELF_HARM: uma pergunta de esclarecimento
   * automatizada — nunca uma avaliação humana, apenas o próprio relato da
   * pessoa a decidir se o sinal escala ou desce de gravidade.
   */
  clarification: CrisisClarificationPrompt | null;
  /** Se true, o fluxo automatizado tem de parar aqui — nunca oferecer sessão. */
  blocksSession: boolean;
}

const AMBIGUOUS_ACKNOWLEDGEMENT =
  "Notámos algo no que escreveu que nos preocupa. Não vamos ignorar isso, " +
  "e também não vamos assumir que sabemos o que se passa. Aqui estão " +
  "recursos de apoio — a decisão de continuar é sua.";

function buildClarificationPrompt(level: ClarificationLevel): CrisisClarificationPrompt {
  if (level === "DIRECT_MENTION") {
    return {
      level,
      question: "Quando diz isso, está a pensar em suicídio neste momento?",
      options: [
        { label: "Sim, estou a pensar nisso agora", resolution: "ESCALATE" },
        { label: "Não, foi só uma forma de dizer", resolution: "DOWNGRADE" },
      ],
    };
  }
  return {
    level,
    question: "Quando isso aconteceu, queria morrer, não queria morrer, ou não tinha a certeza?",
    options: [
      { label: "Queria morrer", resolution: "ESCALATE" },
      { label: "Não queria morrer", resolution: "DOWNGRADE" },
      { label: "Não tinha a certeza", resolution: "DOWNGRADE" },
    ],
  };
}

/** ESCALATE resolve sempre para o nível mais grave; DOWNGRADE para o nível ambíguo. */
export function resolveClarification(resolution: ClarificationResolution): CrisisLevel {
  return resolution === "ESCALATE" ? "CLEAR" : "AMBIGUOUS";
}

export class CrisisService {
  constructor(
    private readonly classifier: CrisisClassifier = new HeuristicCrisisClassifier(),
  ) {}

  get classifierVersion(): string {
    return this.classifier.version;
  }

  /**
   * Corre o classificador sobre cada texto livre fornecido (secção 5:
   * "cada input do check-in e cada mensagem livre do utilizador"), combina
   * pelo nível mais severo, regista o evento de auditoria, e devolve a
   * decisão pronta para a API expor — nunca aconselha, só mostra recursos
   * (e, em DIRECT_MENTION/SELF_HARM, uma pergunta de esclarecimento).
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

    return this.buildOutcome(overall, params.locale);
  }

  /**
   * Reavalia a decisão depois de o utilizador responder à pergunta de
   * esclarecimento — nunca decidida sozinha, sempre a partir da resposta
   * da própria pessoa (secção 5).
   */
  resolvedOutcome(
    resolution: ClarificationResolution,
    classifierVersion: string,
    locale: string,
  ): CrisisCheckOutcome {
    const level = resolveClarification(resolution);
    return this.buildOutcome({ level, classifierVersion }, locale);
  }

  private buildOutcome(result: ClassificationResult, locale: string): CrisisCheckOutcome {
    if (result.level === "ABSENT") {
      return {
        result,
        response: null,
        noRealTimeSupervisionNotice: null,
        acknowledgement: null,
        clarification: null,
        blocksSession: false,
      };
    }

    const response = getCrisisResponseBundleForLocale(locale);

    if (needsClarification(result.level)) {
      return {
        result,
        response,
        noRealTimeSupervisionNotice: NO_REALTIME_SUPERVISION_NOTICE,
        acknowledgement: null,
        clarification: buildClarificationPrompt(result.level),
        blocksSession: true,
      };
    }

    if (result.level === "CLEAR") {
      // "Para a sessão automatizada imediatamente, mostra recursos sem
      // fricção" — sem reconhecimento intermédio, sem oferta de continuar.
      return {
        result,
        response,
        noRealTimeSupervisionNotice: NO_REALTIME_SUPERVISION_NOTICE,
        acknowledgement: null,
        clarification: null,
        blocksSession: true,
      };
    }

    // AMBIGUOUS: mostra recursos + reconhece o sinal explicitamente antes de
    // oferecer continuar. O caller decide separadamente se oferece a opção
    // de continuar depois de mostrar isto — nunca decidimos aqui.
    return {
      result,
      response,
      noRealTimeSupervisionNotice: NO_REALTIME_SUPERVISION_NOTICE,
      acknowledgement: AMBIGUOUS_ACKNOWLEDGEMENT,
      clarification: null,
      blocksSession: true,
    };
  }
}
