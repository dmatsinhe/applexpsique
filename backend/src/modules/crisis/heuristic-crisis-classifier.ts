import type { ClassificationResult, CrisisClassifier } from "./crisis.types.js";
import {
  AMBIGUOUS_DIMENSION_ENTRIES,
  CLEAR_DIMENSION_ENTRIES,
  DIRECT_MENTION_DIMENSION_ENTRIES,
  SELF_HARM_DIMENSION_ENTRIES,
  findMatch,
  type LexiconEntry,
} from "./crisis-lexicon.js";

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Classificador heurístico usado no MVP, estruturado segundo a taxonomia
 * clínica revista pela fundadora (ver crisis-lexicon.ts): intenção/plano/
 * comportamento preparatório vão diretamente a CLEAR (mais graves, sem
 * pergunta intermédia); autolesão e menção direta a suicídio passam por
 * uma pergunta de esclarecimento própria antes de se resolverem.
 *
 * Ordem de verificação = ordem de severidade (mais grave primeiro), para
 * que texto com múltiplos sinais nunca seja subclassificado.
 *
 * Deliberadamente conservador numa só direção: perante incerteza entre
 * AMBIGUOUS e ABSENT, prefere AMBIGUOUS (ver docs/crisis-detection.md —
 * falsos negativos são o modo de falha que este produto não pode tolerar).
 */
export class HeuristicCrisisClassifier implements CrisisClassifier {
  readonly version = "heuristic-clinical-taxonomy-v3";

  classify(text: string): ClassificationResult {
    const normalized = normalize(text);

    const clearMatch = findMatch(CLEAR_DIMENSION_ENTRIES, normalized);
    if (clearMatch) return this.result("CLEAR", clearMatch);

    const selfHarmMatch = findMatch(SELF_HARM_DIMENSION_ENTRIES, normalized);
    if (selfHarmMatch) return this.result("SELF_HARM", selfHarmMatch);

    const directMentionMatch = findMatch(DIRECT_MENTION_DIMENSION_ENTRIES, normalized);
    if (directMentionMatch) return this.result("DIRECT_MENTION", directMentionMatch);

    const ambiguousMatch = findMatch(AMBIGUOUS_DIMENSION_ENTRIES, normalized);
    if (ambiguousMatch) return this.result("AMBIGUOUS", ambiguousMatch);

    return { level: "ABSENT", classifierVersion: this.version };
  }

  private result(
    level: ClassificationResult["level"],
    match: LexiconEntry,
  ): ClassificationResult {
    return {
      level,
      matchedPattern: match.pattern,
      dimension: match.dimension,
      classifierVersion: this.version,
    };
  }
}
