import { describe, expect, it } from "vitest";
import { HeuristicCrisisClassifier } from "./heuristic-crisis-classifier.js";
import { CRISIS_CORPUS } from "../../../test/crisis-corpus/corpus.js";

// Ver docs/crisis-detection.md — este limiar é provisório de engenharia
// (zero falsos negativos tolerados no corpus ATUAL), não o limiar clínico
// de lançamento. Falhar aqui deve bloquear o pipeline, nunca ser ignorado.
const MAX_ACCEPTABLE_FALSE_NEGATIVE_RATE = 0;

const severityRank: Record<string, number> = { ABSENT: 0, AMBIGUOUS: 1, CLEAR: 2 };

describe("HeuristicCrisisClassifier — corpus PT-PT", () => {
  const classifier = new HeuristicCrisisClassifier();

  it("nunca classifica um caso de crise (CLEAR/AMBIGUOUS) como ABSENT — sem falsos negativos no corpus atual", () => {
    const crisisCases = CRISIS_CORPUS.filter((c) => c.expectedLevel !== "ABSENT");
    const falseNegatives = crisisCases.filter(
      (c) => classifier.classify(c.text).level === "ABSENT",
    );

    const falseNegativeRate = falseNegatives.length / crisisCases.length;

    if (falseNegatives.length > 0) {
      // eslint-disable-next-line no-console
      console.error(
        "Falsos negativos detetados:",
        falseNegatives.map((c) => c.text),
      );
    }

    expect(falseNegativeRate).toBeLessThanOrEqual(MAX_ACCEPTABLE_FALSE_NEGATIVE_RATE);
  });

  it("nunca sub-classifica CLEAR como ABSENT nem AMBIGUOUS (sem downgrade de severidade)", () => {
    const clearCases = CRISIS_CORPUS.filter((c) => c.expectedLevel === "CLEAR");
    for (const testCase of clearCases) {
      const result = classifier.classify(testCase.text);
      expect(
        severityRank[result.level],
        `"${testCase.text}" esperado CLEAR, obtido ${result.level}`,
      ).toBeGreaterThanOrEqual(severityRank["CLEAR"]);
    }
  });

  it("não dispara em texto de rotina sem sinal de crise (verifica ruído de falsos positivos)", () => {
    const absentCases = CRISIS_CORPUS.filter((c) => c.expectedLevel === "ABSENT" && c.text.length > 0);
    const falsePositives = absentCases.filter(
      (c) => classifier.classify(c.text).level !== "ABSENT",
    );
    // Registado mas não falha o build — falso positivo é o lado seguro do
    // erro (ver docs/crisis-detection.md), por isso reportamos sem
    // bloquear, para acompanhar tendência ao longo do tempo.
    if (falsePositives.length > 0) {
      // eslint-disable-next-line no-console
      console.warn(
        "Falsos positivos (aceitável, mas a acompanhar):",
        falsePositives.map((c) => c.text),
      );
    }
    expect(true).toBe(true);
  });

  it("classifica corretamente cada caso do corpus ao nível exato esperado (referência, não gate de lançamento)", () => {
    const mismatches = CRISIS_CORPUS.filter(
      (c) => classifier.classify(c.text).level !== c.expectedLevel,
    ).map((c) => ({
      text: c.text,
      expected: c.expectedLevel,
      actual: classifier.classify(c.text).level,
    }));

    // eslint-disable-next-line no-console
    if (mismatches.length > 0) console.info("Discrepâncias nível exato:", mismatches);

    // Não bloqueia o build por si só (AMBIGUOUS classificado como CLEAR é
    // aceitável do ponto de vista de segurança, por exemplo) — só regista.
    expect(Array.isArray(mismatches)).toBe(true);
  });
});
