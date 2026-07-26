import { FOUNDER_PROFILE } from "../../lib/founder-profile.js";

/**
 * Secção 5 (revista): a app nunca promete supervisão humana em tempo real.
 * Sempre que há sinal de risco, mostram-se SEMPRE estes três blocos,
 * distintos e claramente identificados — nunca fundidos numa única frase:
 *
 *   1. `immediateResources` — recursos de crise imediatos (Linha 1411, 112).
 *   2. `regionalProfessionalSupport` — encaminhamento para apoio
 *      profissional na área do utilizador (clínicas, ordens profissionais,
 *      apoio psicológico online).
 *   3. `founderPrivateContact` — contacto da fundadora, rotulado
 *      inequivocamente como sugestão de marcação de consulta PRIVADA fora
 *      da app, nunca como canal de resposta a crise.
 */

export interface CrisisResource {
  name: string;
  description: string;
  phone?: string;
  availability: string;
}

export interface RegionalProfessionalSupportOption {
  name: string;
  description: string;
  contact?: string;
}

export interface FounderPrivateContact {
  /** Rótulo obrigatório mostrado junto ao contacto — nunca omitido. */
  disclaimerLabel: string;
  name: string;
  credentials: string;
  bookingContact: string;
}

export interface CrisisResponseBundle {
  immediateResources: CrisisResource[];
  regionalProfessionalSupport: RegionalProfessionalSupportOption[];
  founderPrivateContact: FounderPrivateContact;
}

/**
 * Recursos de crise imediatos para Portugal — a Linha 1411 (Linha Nacional
 * de Prevenção do Suicídio e Apoio Psicológico), não uma referência
 * genérica a "SNS 24" (secção 5). Ver docs/interno/classificação-sinais-crise.md
 * para a lista completa por país.
 */
const PT_IMMEDIATE_RESOURCES: CrisisResource[] = [
  {
    name: "Linha 1411 — Linha Nacional de Prevenção do Suicídio e Apoio Psicológico",
    description: "Atendida por psicólogos com formação em suicidologia.",
    phone: "1411",
    availability: "24 horas, todos os dias, 365 dias por ano",
  },
  {
    name: "112 — Emergência",
    description: "Perigo de vida iminente.",
    phone: "112",
    availability: "24 horas, todos os dias",
  },
];

const PT_REGIONAL_PROFESSIONAL_SUPPORT: RegionalProfessionalSupportOption[] = [
  {
    name: "SNS 24",
    description: "Linha de saúde do Serviço Nacional de Saúde — triagem e encaminhamento geral, não específica de crise.",
    contact: "808 24 24 24",
  },
  {
    name: "Ordem dos Psicólogos Portugueses",
    description: "Diretório de profissionais licenciados para marcação de consulta.",
    contact: "https://www.ordemdospsicologos.pt",
  },
  {
    name: "SOS Voz Amiga",
    description: "Linha de apoio emocional por voluntários com formação, diariamente das 16h às 24h.",
    contact: "213 544 545 / 912 802 669 / 963 524 660",
  },
];

function founderPrivateContact(): FounderPrivateContact {
  return {
    disclaimerLabel:
      "Contacto da fundadora — sugestão de marcação de consulta privada fora da app. " +
      "Isto NÃO é um canal de resposta a crises e não notifica ninguém agora.",
    name: FOUNDER_PROFILE.name,
    credentials: FOUNDER_PROFILE.credentials,
    bookingContact: FOUNDER_PROFILE.privateBookingContact,
  };
}

export function getCrisisResponseBundleForLocale(locale: string): CrisisResponseBundle {
  // Só PT-PT suportado no MVP — expansão a PALOP exige recursos próprios
  // por país (ver docs/interno/classificação-sinais-crise.md), nunca
  // reutilizar os de Portugal.
  if (locale.startsWith("pt-PT") || locale === "pt") {
    return {
      immediateResources: PT_IMMEDIATE_RESOURCES,
      regionalProfessionalSupport: PT_REGIONAL_PROFESSIONAL_SUPPORT,
      founderPrivateContact: founderPrivateContact(),
    };
  }
  throw new Error(
    `Sem recursos de crise configurados para o locale "${locale}" — não mostrar uma lista genérica.`,
  );
}
