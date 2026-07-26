/**
 * Recursos de crise para Portugal (secção 5): sempre estes, nunca uma lista
 * genérica internacional. Quando a app expandir a PALOP, adicionar um mapa
 * por país aqui — nunca reaproveitar os contactos de Portugal para outro
 * país "por defeito".
 */
export interface CrisisResource {
  name: string;
  description: string;
  phone?: string;
  availability: string;
}

export const PT_CRISIS_RESOURCES: CrisisResource[] = [
  {
    name: "SNS 24",
    description: "Linha de saúde do Serviço Nacional de Saúde, encaminhamento em situação de crise.",
    phone: "808 24 24 24",
    availability: "24 horas, todos os dias",
  },
  {
    name: "SOS Voz Amiga",
    description: "Linha de apoio emocional e prevenção do suicídio.",
    phone: "213 544 545 / 912 802 669 / 963 524 660",
    availability: "Diariamente, das 16h às 24h",
  },
  {
    name: "Linha Nacional de Emergência",
    description: "Emergência médica imediata.",
    phone: "112",
    availability: "24 horas, todos os dias",
  },
];

export function getCrisisResourcesForLocale(locale: string): CrisisResource[] {
  // Só PT-PT suportado no MVP — expansão a PALOP exige contactos próprios
  // por país, nunca reutilizar os de Portugal.
  if (locale.startsWith("pt-PT") || locale === "pt") {
    return PT_CRISIS_RESOURCES;
  }
  throw new Error(
    `Sem recursos de crise configurados para o locale "${locale}" — não mostrar uma lista genérica.`,
  );
}
