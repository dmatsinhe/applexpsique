/**
 * Fonte única do perfil da fundadora (secção 4) — usada tanto pelo endpoint
 * de transparência clínica (`/founder`) como pelo bloco de contacto privado
 * mostrado em respostas de crise (secção 5).
 *
 * Conteúdo verificado a partir do CV e certificados fornecidos pela
 * fundadora (maio de 2023 / outubro de 2023).
 */
export const FOUNDER_PROFILE = {
  name: "Dália Matsinhe",

  // Resumo curto — usado no bloco de contacto de crise (nunca aconselha,
  // só identifica quem é o contacto).
  credentials:
    "Psicóloga (Mestre em Psicologia Social e das Organizações, ISCTE) " +
    "e Hipnoterapeuta Certificada em RTT® (Rapid Transformational Therapy®)",

  licenseNumber: "APA — American Psychological Association, nº de membro 01504942",

  methodology: ["TCC", "PNL", "Hipnose Clínica", "RTT"] as const,

  academicCredentials: [
    "Mestrado em Psicologia Social e das Organizações — ISCTE, Instituto Universitário de Lisboa (2008–2011)",
    "Licenciatura em Psicologia Criminal e do Comportamento Desviante — ULHT, Universidade Lusófona de Humanidades e Tecnologias (2000–2006)",
    "Pós-graduação em Ciências Forenses — Instituto CRIAP (2016–2017)",
  ],

  clinicalCertifications: [
    "Certified Hypnotherapist — The School of Rapid Transformational Therapy® (Marisa Peer), nº de graduada 476005, 2 de outubro de 2023",
    "Rapid Transformational Therapy® Practitioner — The School of Rapid Transformational Therapy® (Marisa Peer), nº de graduada 476005, 2 de outubro de 2023",
    "Master em Programação Neurolinguística (PNL) — Instituto Kronos (2022)",
    "Formação Internacional e Avançada em Hipnose Clínica — Instituto Lucas Naves (2020–2021)",
  ],

  experienceSummary:
    "Mais de 15 anos de prática clínica e de consultoria em psicologia, em " +
    "Moçambique e Portugal — incluindo funções como psicóloga clínica na " +
    "WorkPlace Options e na ICAS Seguros, e psicóloga/hipnoterapeuta em " +
    "clínicas como o MindFull Wellness Center, a Thula Thula Clinic e a " +
    "COOPMED. Sócia-gerente da Lexpsique, Formação e Consultoria, Lda. " +
    "desde 2017.",

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
