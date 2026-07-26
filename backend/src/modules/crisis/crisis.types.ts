export const CRISIS_LEVELS = ["CLEAR", "AMBIGUOUS", "ABSENT"] as const;
export type CrisisLevel = (typeof CRISIS_LEVELS)[number];

export interface ClassificationResult {
  level: CrisisLevel;
  /** Which lexicon entry matched, kept in-process only — never persisted verbatim. */
  matchedPattern?: string;
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
