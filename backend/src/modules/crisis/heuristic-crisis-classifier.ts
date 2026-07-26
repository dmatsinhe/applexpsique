import type { ClassificationResult, CrisisClassifier } from "./crisis.types.js";
import { AMBIGUOUS_DIMENSION_ENTRIES, CLEAR_DIMENSION_ENTRIES, findMatch } from "./crisis-lexicon.js";

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Classificador heurístico usado no MVP, estruturado segundo as dimensões
 * do C-SSRS/Columbia Protocol (ver crisis-lexicon.ts) em vez de uma lista
 * de frases plana. Deliberadamente conservador numa só direção: perante
 * incerteza entre AMBIGUOUS e ABSENT, prefere AMBIGUOUS (ver
 * docs/crisis-detection.md — falsos negativos são o modo de falha que este
 * produto não pode tolerar; falsos positivos custam só um momento de
 * fricção).
 */
export class HeuristicCrisisClassifier implements CrisisClassifier {
  readonly version = "heuristic-cssrs-lexicon-v2";

  classify(text: string): ClassificationResult {
    const normalized = normalize(text);

    // Dimensões de maior severidade (ideação ativa, plano, intenção,
    // comportamento preparatório) verificadas primeiro — qualquer uma
    // classifica como CLARO, sem exceção.
    const clearMatch = findMatch(CLEAR_DIMENSION_ENTRIES, normalized);
    if (clearMatch) {
      return {
        level: "CLEAR",
        matchedPattern: clearMatch.pattern,
        dimension: clearMatch.dimension,
        classifierVersion: this.version,
      };
    }

    // Ideação passiva (C-SSRS item 1) classifica como AMBÍGUO.
    const ambiguousMatch = findMatch(AMBIGUOUS_DIMENSION_ENTRIES, normalized);
    if (ambiguousMatch) {
      return {
        level: "AMBIGUOUS",
        matchedPattern: ambiguousMatch.pattern,
        dimension: ambiguousMatch.dimension,
        classifierVersion: this.version,
      };
    }

    return { level: "ABSENT", classifierVersion: this.version };
  }
}
