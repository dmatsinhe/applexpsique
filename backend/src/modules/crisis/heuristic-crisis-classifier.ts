import type { ClassificationResult, CrisisClassifier } from "./crisis.types.js";
import { AMBIGUOUS_PHRASES, CLEAR_PHRASES, findMatch } from "./crisis-lexicon.js";

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Heuristic lexicon-based classifier used for the MVP. Deliberately
 * conservative in one direction only: when in doubt between AMBIGUOUS and
 * ABSENT, prefer AMBIGUOUS (see docs/crisis-detection.md — false negatives
 * are the failure mode this product cannot tolerate, false positives cost
 * only a moment of friction).
 */
export class HeuristicCrisisClassifier implements CrisisClassifier {
  readonly version = "heuristic-lexicon-v1";

  classify(text: string): ClassificationResult {
    const normalized = normalize(text);

    const clearMatch = findMatch(CLEAR_PHRASES, normalized);
    if (clearMatch) {
      return {
        level: "CLEAR",
        matchedPattern: clearMatch.pattern,
        classifierVersion: this.version,
      };
    }

    const ambiguousMatch = findMatch(AMBIGUOUS_PHRASES, normalized);
    if (ambiguousMatch) {
      return {
        level: "AMBIGUOUS",
        matchedPattern: ambiguousMatch.pattern,
        classifierVersion: this.version,
      };
    }

    return { level: "ABSENT", classifierVersion: this.version };
  }
}
