import type { CrisisDimension } from "./crisis-lexicon.js";

/**
 * Cinco níveis (revisão clínica — ver crisis-lexicon.ts): DIRECT_MENTION e
 * SELF_HARM são estados transitórios que passam por uma pergunta de
 * esclarecimento automatizada antes de se resolverem para CLEAR (escalar)
 * ou AMBIGUOUS (manter, mostrar recursos, permitir continuar).
 */
export const CRISIS_LEVELS = ["CLEAR", "SELF_HARM", "DIRECT_MENTION", "AMBIGUOUS", "ABSENT"] as const;
export type CrisisLevel = (typeof CRISIS_LEVELS)[number];

/** Níveis que exigem uma pergunta de esclarecimento antes de se considerarem finais. */
export const CLARIFICATION_LEVELS = ["DIRECT_MENTION", "SELF_HARM"] as const;
export type ClarificationLevel = (typeof CLARIFICATION_LEVELS)[number];

export function needsClarification(level: CrisisLevel): level is ClarificationLevel {
  return (CLARIFICATION_LEVELS as readonly string[]).includes(level);
}

export interface ClassificationResult {
  level: CrisisLevel;
  /** Which lexicon entry matched, kept in-process only — never persisted verbatim. */
  matchedPattern?: string;
  /** Dimensão clínica que motivou o nível — ver crisis-lexicon.ts. */
  dimension?: CrisisDimension;
  classifierVersion: string;
}

/**
 * Pluggable interface so the MVP's heuristic lexicon classifier can later be
 * replaced or augmented (e.g. a Claude-based or clinically-trained model)
 * without changing any caller. See docs/crisis-detection.md.
 */
export interface CrisisClassifier {
  readonly version: string;
  classify(text: string): ClassificationResult;
}

function severityRank(level: CrisisLevel): number {
  switch (level) {
    case "CLEAR":
      return 4;
    case "SELF_HARM":
      return 3;
    case "DIRECT_MENTION":
      return 2;
    case "AMBIGUOUS":
      return 1;
    case "ABSENT":
      return 0;
  }
}

/** Combines per-answer classifications into one overall level — the most severe wins. */
export function mostSevere(results: ClassificationResult[]): ClassificationResult {
  return results.reduce((worst, current) =>
    severityRank(current.level) > severityRank(worst.level) ? current : worst,
  );
}
