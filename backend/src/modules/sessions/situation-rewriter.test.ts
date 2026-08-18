import { describe, expect, it, vi } from "vitest";
import { SituationRewriter } from "./situation-rewriter.js";

function fakeClient(response: unknown) {
  return {
    messages: {
      create: vi.fn().mockResolvedValue(response),
    },
  } as never;
}

describe("SituationRewriter — falha sempre em segurança", () => {
  it("devolve o texto original quando não há chave configurada (client null)", async () => {
    const rewriter = new SituationRewriter(null);
    const result = await rewriter.rewrite("o exame de amanhã");
    expect(result).toBe("o exame de amanhã");
  });

  it("devolve o texto original sem chamar a IA quando a situação está vazia", async () => {
    const client = fakeClient({ content: [{ type: "text", text: "não devia ser chamado" }] });
    const rewriter = new SituationRewriter(client);
    const result = await rewriter.rewrite("   ");
    expect(result).toBe("   ");
    expect((client as { messages: { create: ReturnType<typeof vi.fn> } }).messages.create).not.toHaveBeenCalled();
  });

  it("devolve a reescrita da IA quando a chamada tem sucesso", async () => {
    const client = fakeClient({ content: [{ type: "text", text: "uma frase mais suave" }] });
    const rewriter = new SituationRewriter(client);
    const result = await rewriter.rewrite("o exame de amanhã");
    expect(result).toBe("uma frase mais suave");
  });

  it("remove sintaxe de placeholder do texto devolvido pela IA", async () => {
    const client = fakeClient({ content: [{ type: "text", text: "{{situacao}} inventada pela IA" }] });
    const rewriter = new SituationRewriter(client);
    const result = await rewriter.rewrite("o exame de amanhã");
    expect(result).not.toContain("{{");
    expect(result).toContain("inventada pela IA");
  });

  it("devolve o texto original quando a IA falha (erro de rede/timeout)", async () => {
    const client = {
      messages: { create: vi.fn().mockRejectedValue(new Error("timeout")) },
    } as never;
    const rewriter = new SituationRewriter(client);
    const result = await rewriter.rewrite("o exame de amanhã");
    expect(result).toBe("o exame de amanhã");
  });

  it("devolve o texto original quando a resposta da IA vem vazia ou em formato inesperado", async () => {
    const client = fakeClient({ content: [] });
    const rewriter = new SituationRewriter(client);
    const result = await rewriter.rewrite("o exame de amanhã");
    expect(result).toBe("o exame de amanhã");
  });

  it("devolve o texto original quando a IA responde só com espaços", async () => {
    const client = fakeClient({ content: [{ type: "text", text: "   " }] });
    const rewriter = new SituationRewriter(client);
    const result = await rewriter.rewrite("o exame de amanhã");
    expect(result).toBe("o exame de amanhã");
  });
});
