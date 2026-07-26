import { Router } from "express";

/**
 * Perfil da fundadora + "Como isto funciona" (secção 4) — conteúdo
 * estático de transparência clínica, gerido fora do código à medida que a
 * fundadora o fornece. Aqui só o endpoint que o serve.
 */
const router = Router();

router.get("/", (_req, res) => {
  res.json({
    name: "[Nome da fundadora — a preencher]",
    credentials: "[Credenciais e nº de cédula profissional — a preencher]",
    methodology: ["TCC", "PNL", "Hipnose Clínica", "RTT"],
    howItWorks:
      "Todo o conteúdo apresentado nesta app é escrito e aprovado por uma " +
      "profissional licenciada antes de ir ao ar. A personalização por " +
      "inteligência artificial acontece apenas dentro de limites definidos " +
      "em cada template aprovado (nome, situação, ritmo, ênfase) — nunca " +
      "reescreve a estrutura terapêutica, a técnica de indução, nem as " +
      "sugestões centrais. Esta app é um apoio complementar, não um " +
      "substituto de terapia presencial. Se precisar de ajuda imediata, " +
      "contacte sempre uma linha de apoio de crise ou os serviços de " +
      "emergência.",
  });
});

export default router;
