import { describe, expect, it, vi } from "vitest";
import { PersonalizationService } from "./personalization.service.js";
import { SituationRewriter } from "./situation-rewriter.js";
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
      personalizableOpening: "Olá {{nome}}, vamos focar-nos em {{situacao}}.",
      sections: [
        { id: "inducao", title: "Indução", body: "Indução fixa aprovada." },
        { id: "sugestoes-centrais", title: "Sugestões centrais", body: "Sugestão fixa 1\nSugestão fixa 2" },
      ],
      anchorPhrases: ["Âncora A", "Âncora B", "Âncora C"],
      closing: "Encerramento fixo aprovado.",
      paceOptions: ["lento", "moderado"],
    },
  };
}

describe("PersonalizationService — limites rígidos de personalização", () => {
  const service = new PersonalizationService();

  it("substitui apenas {{nome}} e {{situacao}}, nunca altera indução/sugestões/encerramento", async () => {
    const template = makeTemplate();
    const rendered = await service.render(template, { name: "Ana", situationNote: "o exame de amanhã", pace: "lento" });

    expect(rendered.opening).toBe("Olá Ana, vamos focar-nos em o exame de amanhã.");
    expect(rendered.sections).toEqual(template.content.sections);
    expect(rendered.closing).toBe(template.content.closing);
  });

  it("rejeita um ritmo que não esteja nas paceOptions do template", async () => {
    const template = makeTemplate();
    await expect(
      service.render(template, { name: "Ana", pace: "super-rapido-inventado" }),
    ).rejects.toThrow();
  });

  it("rejeita frases-âncora que não existam no template (não pode inventar novas)", async () => {
    const template = makeTemplate();
    await expect(
      service.render(template, {
        name: "Ana",
        pace: "lento",
        emphasizedAnchorPhrases: ["Âncora A", "Frase nova não aprovada"],
      }),
    ).rejects.toThrow();
  });

  it("aceita um subconjunto válido de frases-âncora para enfatizar", async () => {
    const template = makeTemplate();
    const rendered = await service.render(template, {
      name: "Ana",
      pace: "moderado",
      emphasizedAnchorPhrases: ["Âncora B"],
    });
    expect(rendered.emphasizedAnchorPhrases).toEqual(["Âncora B"]);
  });

  it("sanitiza tentativa de injetar sintaxe de placeholder através do nome", async () => {
    const template = makeTemplate();
    const rendered = await service.render(template, {
      name: "Ana {{situacao}} hack",
      situationNote: "situação real",
      pace: "lento",
    });
    // O nome nunca deve introduzir um segundo placeholder vivo — as chavetas
    // são removidas antes da substituição.
    expect(rendered.opening).not.toContain("{{");
    expect(rendered.opening).toContain("situação real");
  });

  it("exige nome não vazio", async () => {
    const template = makeTemplate();
    await expect(service.render(template, { name: "  ", pace: "lento" })).rejects.toThrow();
  });
});

describe("PersonalizationService — reescrita da situação por IA (só Premium)", () => {
  it("chama o SituationRewriter quando useAiPersonalization é true e usa o texto reescrito", async () => {
    const rewriter = new SituationRewriter(null);
    const spy = vi.spyOn(rewriter, "rewrite").mockResolvedValue("versão mais suave do exame de amanhã");
    const service = new PersonalizationService(rewriter);
    const template = makeTemplate();

    const rendered = await service.render(
      template,
      { name: "Ana", situationNote: "o exame de amanhã", pace: "lento" },
      true,
    );

    expect(spy).toHaveBeenCalledWith("o exame de amanhã");
    expect(rendered.opening).toBe("Olá Ana, vamos focar-nos em versão mais suave do exame de amanhã.");
  });

  it("nunca chama o SituationRewriter para utilizadoras Grátis (useAiPersonalization false)", async () => {
    const rewriter = new SituationRewriter(null);
    const spy = vi.spyOn(rewriter, "rewrite");
    const service = new PersonalizationService(rewriter);
    const template = makeTemplate();

    const rendered = await service.render(template, {
      name: "Ana",
      situationNote: "o exame de amanhã",
      pace: "lento",
    });

    expect(spy).not.toHaveBeenCalled();
    expect(rendered.opening).toBe("Olá Ana, vamos focar-nos em o exame de amanhã.");
  });

  it("sanitiza o resultado da IA contra sintaxe de placeholder injetada", async () => {
    const rewriter = new SituationRewriter(null);
    vi.spyOn(rewriter, "rewrite").mockResolvedValue("{{situacao}} hack de novo");
    const service = new PersonalizationService(rewriter);
    const template = makeTemplate();

    const rendered = await service.render(
      template,
      { name: "Ana", situationNote: "o exame de amanhã", pace: "lento" },
      true,
    );

    expect(rendered.opening).not.toContain("{{");
    expect(rendered.opening).toContain("hack de novo");
  });
});
