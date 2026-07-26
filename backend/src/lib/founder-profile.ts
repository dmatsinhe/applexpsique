/**
 * Fonte única do perfil da fundadora (secção 4) — usada tanto pelo endpoint
 * de transparência clínica (`/founder`) como pelo bloco de contacto privado
 * mostrado em respostas de crise (secção 5). Conteúdo estático, gerido fora
 * do código à medida que a fundadora o fornece.
 */
export const FOUNDER_PROFILE = {
  name: "[Nome da fundadora — a preencher]",
  credentials: "[Credenciais e nº de cédula profissional — a preencher]",
  methodology: ["TCC", "PNL", "Hipnose Clínica", "RTT"] as const,
  howItWorks:
    "Todo o conteúdo apresentado nesta app é escrito e aprovado por uma " +
    "profissional licenciada antes de ir ao ar. A personalização por " +
    "inteligência artificial acontece apenas dentro de limites definidos " +
    "em cada template aprovado (nome, situação, ritmo, ênfase) — nunca " +
    "reescreve a estrutura terapêutica, a técnica de indução, nem as " +
    "sugestões centrais. Esta app é um apoio complementar, não um " +
    "substituto de terapia presencial. Não há supervisão humana em tempo " +
    "real dentro da app — em caso de crise, contacte sempre uma linha de " +
    "apoio ou os serviços de emergência.",
  // Contacto para marcação de consulta privada FORA da app — nunca
  // apresentado como canal de resposta a crise (ver crisis-resources.ts).
  privateBookingContact: "www.daliamatsinhe.com",
};
