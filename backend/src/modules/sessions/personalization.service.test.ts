import { describe, expect, it } from "vitest";
import { PersonalizationService } from "./personalization.service.js";
import type { ActiveTemplateVersion } from "../templates/template.repository.js";

function makeTemplate(): ActiveTemplateVersion {
  return {
    id: "template-version-1",
    templateId: "template-1",
    slug: "teste",
    clinicalGoal: "SLEEP",
    title: "Teste",
    version: 1,
    approvedBy: "fundadora-teste@lexpsique.pt",
    approvedAt: new Date(),
    content: {
      induction: "Indução fixa aprovada.",
      coreSuggestions: ["Sugestão fixa 1", "Sugestão fixa 2"],
      anchorPhrases: ["Âncora A", "Âncora B", "Âncora C"],
      closing: "Encerramento fixo aprovado.",
      personalizableOpening: "Olá {{nome}}, vamos focar-nos em {{situacao}}.",
      paceOptions: ["lento", "moderado"],
    },
  };
}

describe("PersonalizationService — limites rígidos de personalização", () => {
  const service = new PersonalizationService();

  it("substitui apenas {{nome}} e {{situacao}}, nunca altera indução/sugestões/encerramento", () => {
    const template = makeTemplate();
    const rendered = service.render(template, { name: "Ana", situationNote: "o exame de amanhã", pace: "lento" });

    expect(rendered.opening).toBe("Olá Ana, vamos focar-nos em o exame de amanhã.");
    expect(rendered.induction).toBe(template.content.induction);
    expect(rendered.coreSuggestions).toEqual(template.content.coreSuggestions);
    expect(rendered.closing).toBe(template.content.closing);
  });

  it("rejeita um ritmo que não esteja nas paceOptions do template", () => {
    const template = makeTemplate();
    expect(() =>
      service.render(template, { name: "Ana", pace: "super-rapido-inventado" }),
    ).toThrow();
  });

  it("rejeita frases-âncora que não existam no template (não pode inventar novas)", () => {
    const template = makeTemplate();
    expect(() =>
      service.render(template, {
        name: "Ana",
        pace: "lento",
        emphasizedAnchorPhrases: ["Âncora A", "Frase nova não aprovada"],
      }),
    ).toThrow();
  });

  it("aceita um subconjunto válido de frases-âncora para enfatizar", () => {
    const template = makeTemplate();
    const rendered = service.render(template, {
      name: "Ana",
      pace: "moderado",
      emphasizedAnchorPhrases: ["Âncora B"],
    });
    expect(rendered.emphasizedAnchorPhrases).toEqual(["Âncora B"]);
  });

  it("sanitiza tentativa de injetar sintaxe de placeholder através do nome", () => {
    const template = makeTemplate();
    const rendered = service.render(template, {
      name: "Ana {{situacao}} hack",
      situationNote: "situação real",
      pace: "lento",
    });
    // O nome nunca deve introduzir um segundo placeholder vivo — as chavetas
    // são removidas antes da substituição.
    expect(rendered.opening).not.toContain("{{");
    expect(rendered.opening).toContain("situação real");
  });

  it("exige nome não vazio", () => {
    const template = makeTemplate();
    expect(() => service.render(template, { name: "  ", pace: "lento" })).toThrow();
  });
});
