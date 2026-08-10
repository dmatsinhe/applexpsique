import { PrismaClient } from "@prisma/client";
import { templateContentSchema } from "../src/modules/templates/template-content.schema.js";
import type { TemplateContent } from "../src/modules/templates/template.types.js";

/**
 * Semente de desenvolvimento — NUNCA aprova templates.
 *
 * Nota (ver /docs, secção final do briefing): "os templates clínicos em si
 * são escritos e aprovados pela fundadora fora do Claude Code". Este script
 * cria templates em estado DRAFT com conteúdo de exemplo claramente
 * marcado como placeholder, para que o resto do sistema (check-in, seleção,
 * personalização) possa ser desenvolvido e testado sem que nenhum texto
 * clínico real seja fabricado por engenharia. Nenhum destes templates é
 * servível a utilizadores enquanto não for revisto e aprovado por um
 * profissional licenciado através do fluxo de aprovação real.
 */

const prisma = new PrismaClient();

const PLACEHOLDER_PREFIX = "[PLACEHOLDER DE DESENVOLVIMENTO — NÃO É CONTEÚDO CLÍNICO APROVADO] ";

function placeholderContent(topic: string): TemplateContent {
  return {
    personalizableOpening: `${PLACEHOLDER_PREFIX}Olá {{nome}}, vamos focar-nos hoje em {{situacao}}.`,
    sections: [
      {
        id: "inducao",
        title: "Indução",
        body: `${PLACEHOLDER_PREFIX}Indução de exemplo para "${topic}". Substituir por texto aprovado.`,
      },
      {
        id: "sugestoes-centrais",
        title: "Sugestões centrais",
        body: `${PLACEHOLDER_PREFIX}Sugestão central de exemplo 1 para "${topic}".\n${PLACEHOLDER_PREFIX}Sugestão central de exemplo 2 para "${topic}".`,
      },
    ],
    anchorPhrases: [
      `${PLACEHOLDER_PREFIX}Frase-âncora de exemplo A.`,
      `${PLACEHOLDER_PREFIX}Frase-âncora de exemplo B.`,
    ],
    closing: `${PLACEHOLDER_PREFIX}Encerramento de exemplo para "${topic}".`,
    paceOptions: ["lento", "moderado"],
  };
}

const SEED_TEMPLATES: Array<{ slug: string; clinicalGoal: string; title: string; topic: string }> = [
  { slug: "sono-dev-placeholder", clinicalGoal: "SLEEP", title: "Sono (placeholder de desenvolvimento)", topic: "sono" },
  { slug: "ansiedade-generalizada-dev-placeholder", clinicalGoal: "GENERALIZED_ANXIETY", title: "Ansiedade generalizada (placeholder de desenvolvimento)", topic: "ansiedade generalizada" },
  { slug: "foco-dev-placeholder", clinicalGoal: "FOCUS", title: "Foco (placeholder de desenvolvimento)", topic: "foco" },
  { slug: "autoestima-dev-placeholder", clinicalGoal: "SELF_ESTEEM", title: "Autoestima (placeholder de desenvolvimento)", topic: "autoestima" },
];

async function main() {
  for (const seedTemplate of SEED_TEMPLATES) {
    const content = templateContentSchema.parse(placeholderContent(seedTemplate.topic));

    const template = await prisma.sessionTemplate.upsert({
      where: { slug: seedTemplate.slug },
      update: {},
      create: {
        slug: seedTemplate.slug,
        clinicalGoal: seedTemplate.clinicalGoal as any,
        title: seedTemplate.title,
      },
    });

    const existingVersion = await prisma.templateVersion.findFirst({
      where: { templateId: template.id, version: 1 },
    });

    if (!existingVersion) {
      await prisma.templateVersion.create({
        data: {
          templateId: template.id,
          version: 1,
          status: "DRAFT",
          content,
          // approvedBy/approvedAt/isActive ficam por preencher deliberadamente.
        },
      });
      console.log(`Criado template DRAFT (não aprovado): ${seedTemplate.slug}`);
    } else {
      console.log(`Template já existe, ignorado: ${seedTemplate.slug}`);
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
