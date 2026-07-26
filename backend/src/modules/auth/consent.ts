/**
 * Texto de consentimento de notificação de crise mostrado no onboarding
 * (secção 5). Versionado propositadamente: se o texto mudar no futuro, o
 * `crisisConsentVersion` gravado no momento da escolha do utilizador
 * continua a refletir exatamente o que essa pessoa leu, sem reescrita
 * retroativa.
 */
export const CRISIS_CONSENT_VERSION = "v1-2026";

export const CRISIS_CONSENT_EXPLANATION = {
  version: CRISIS_CONSENT_VERSION,
  title: "Notificação em caso de sinal claro de crise",
  body:
    "Se o classificador detetar um sinal claro de crise nas suas respostas, " +
    "mostramos-lhe sempre recursos de apoio (linhas de crise, SNS 24). " +
    "Pode ainda escolher se, além disso, a fundadora (ou outra pessoa com " +
    "formação clínica designada por ela) recebe uma notificação em tempo " +
    "real com esse sinal, para tentar contactá-la. Esta notificação NÃO é " +
    "uma rede de segurança 24 horas — é uma camada extra, que depende de " +
    "haver alguém disponível para a receber naquele momento. Os recursos de " +
    "apoio são mostrados sempre, escolha o que escolher aqui.",
  options: [
    {
      value: true as const,
      label: "Sim, notificar também a fundadora em sinais claros de crise",
    },
    {
      value: false as const,
      label: "Não, mostrar-me apenas os recursos de apoio",
    },
  ],
} as const;
