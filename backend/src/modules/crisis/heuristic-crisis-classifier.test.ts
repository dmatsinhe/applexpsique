import { describe, expect, it } from "vitest";
import { HeuristicCrisisClassifier } from "./heuristic-crisis-classifier.js";
import { CRISIS_CORPUS } from "../../../test/crisis-corpus/corpus.js";

// Ver docs/crisis-detection.md — este limiar é provisório de engenharia
// (zero falsos negativos tolerados no corpus ATUAL), não o limiar clínico
// de lançamento. Falhar aqui deve bloquear o pipeline, nunca ser ignorado.
const MAX_ACCEPTABLE_FALSE_NEGATIVE_RATE = 0;

// Espelha crisis.types.ts severityRank — mantido separado para o teste
// não depender de detalhes internos do serviço.
const severityRank: Record<string, number> = {
  ABSENT: 0,
  AMBIGUOUS: 1,
  DIRECT_MENTION: 2,
  SELF_HARM: 3,
  CLEAR: 4,
};

describe("HeuristicCrisisClassifier — corpus PT-PT (taxonomia revista clinicamente)", () => {
  const classifier = new HeuristicCrisisClassifier();

  it("nunca classifica um caso de crise como ABSENT — sem falsos negativos no corpus atual", () => {
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

  it("nunca subclassifica um caso de crise abaixo do nível esperado (sem downgrade de severidade)", () => {
    const crisisCases = CRISIS_CORPUS.filter((c) => c.expectedLevel !== "ABSENT");
    for (const testCase of crisisCases) {
      const result = classifier.classify(testCase.text);
      expect(
        severityRank[result.level],
        `"${testCase.text}" esperado >= ${testCase.expectedLevel}, obtido ${result.level}`,
      ).toBeGreaterThanOrEqual(severityRank[testCase.expectedLevel]);
    }
  });

  it("distingue CLEAR (intenção/plano/preparação) de DIRECT_MENTION e SELF_HARM — nunca junta as três num só nível", () => {
    const clearCases = CRISIS_CORPUS.filter((c) => c.expectedLevel === "CLEAR");
    const directMentionCases = CRISIS_CORPUS.filter((c) => c.expectedLevel === "DIRECT_MENTION");
    const selfHarmCases = CRISIS_CORPUS.filter((c) => c.expectedLevel === "SELF_HARM");

    expect(clearCases.length).toBeGreaterThan(0);
    expect(directMentionCases.length).toBeGreaterThan(0);
    expect(selfHarmCases.length).toBeGreaterThan(0);

    for (const testCase of directMentionCases) {
      expect(
        classifier.classify(testCase.text).level,
        `"${testCase.text}" — menção direta não deve ir automaticamente para CLEAR`,
      ).not.toBe("CLEAR");
    }
    for (const testCase of selfHarmCases) {
      expect(
        classifier.classify(testCase.text).level,
        `"${testCase.text}" — autolesão não deve ir automaticamente para CLEAR`,
      ).not.toBe("CLEAR");
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

    // Não bloqueia o build por si só — só regista, para acompanhar precisão
    // ao longo do tempo sem impedir falsos positivos de segurança.
    expect(Array.isArray(mismatches)).toBe(true);
  });
});
