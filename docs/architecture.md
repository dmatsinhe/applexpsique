# Arquitetura — Lexpsique

## Princípio orientador

O sistema separa rigorosamente duas responsabilidades que nunca se podem misturar:

1. **Conteúdo clínico** (o texto terapêutico em si) — escrito e aprovado por humanos
   (a fundadora, ou outro profissional licenciado que ela designe) fora deste
   repositório de código.
2. **Sistema de personalização e entrega** — o que este código constrói: o
   repositório de templates versionados, o motor que seleciona o template certo,
   a camada que personaliza *dentro* dos limites do template, e a deteção de
   crise que corre sobre tudo o resto.

Nenhum caminho de código pode gerar estrutura terapêutica, técnica de indução
ou sugestões centrais livremente. Isso é aplicado tanto a nível de schema
(templates têm `status`, só `APPROVED` é servível) como a nível de serviço
(o `PersonalizationService` só pode substituir campos explicitamente marcados
como personalizáveis num template).

## Estrutura de pastas

```
/backend
  /prisma
    schema.prisma          — schema da base de dados (ver database-schema.md)
    /migrations
  /src
    /config                — carregamento de variáveis de ambiente, constantes
    /lib
      encryption.ts         — AES-256-GCM para campos sensíveis em repouso
      logger.ts
    /modules
      /auth                 — registo, sessão, verificação de idade (18+)
      /checkin              — fluxo de check-in (3–5 perguntas)
      /crisis               — classificador de risco, 3 níveis, corpus de teste
      /templates            — repositório de templates versionados + aprovação
      /sessions             — sessões de hipnose personalizadas, retomáveis
      /voice                — preferências de voz (fora do MVP passo 1)
      cada módulo:
        <nome>.service.ts   — lógica de negócio
        <nome>.repository.ts — acesso a dados (Prisma)
        <nome>.types.ts
        <nome>.test.ts
    /routes                 — definição de endpoints Express, um ficheiro por módulo
    /middleware
      requireAdult.ts        — bloqueia qualquer rota clínica sem confirmação de idade
      requireAuth.ts
    server.ts
  package.json
  tsconfig.json

/frontend                   — PWA (React + Vite)
  /src
    /pages
      Onboarding/
        AgeGate.tsx           — confirmação explícita de idade (não checkbox genérica)
      CheckIn/
      SessionResult/
      CrisisResources/        — três blocos separados: recursos imediatos,
                                 apoio profissional regional, contacto
                                 privado da fundadora (nunca fundidos)
      FounderProfile/         — credenciais, licença, "Como isto funciona"
    /components
    /api                      — cliente HTTP tipado para o backend
    /state
  package.json

/docs
  architecture.md            — este ficheiro
  database-schema.md
  crisis-detection.md        — corpus de teste, limiar de falsos negativos, processo de revisão
```

## Fluxo do MVP passo 1 (check-in → template → personalização)

1. `POST /auth/register` — regista utilizador; exige confirmação explícita de
   idade (data de nascimento) antes de qualquer acesso a `/checkin` ou
   `/sessions`. A data de nascimento em si não é retida — só o resultado
   (`isAdult: true`, `ageVerifiedAt`) para minimizar dados sensíveis.
2. `POST /checkin` — recebe 3–5 respostas. **Antes de qualquer outra lógica**,
   cada resposta de texto livre passa pelo `CrisisClassifier`.
   - Nível `CLEAR` → devolve imediatamente os três blocos de recursos de
     crise (ver docs/crisis-detection.md), sem oferecer sessão. Regista
     `CrisisEvent` anonimizado.
   - Nível `AMBIGUOUS` → devolve os três blocos de recursos + reconhecimento
     explícito do sinal, e só então oferece a opção de continuar (nunca
     decide sozinho que está tudo bem).
   - Em ambos os níveis acima, a resposta inclui sempre um aviso explícito
     de que a app não tem supervisão humana em tempo real — nunca promete
     uma notificação que não consegue garantir.
   - Nível `ABSENT` → segue para seleção de template.
3. `TemplateSelector` mapeia o objetivo do check-in para um `TemplateVersion`
   com `status = APPROVED`. Se não existir nenhum aprovado para o objetivo
   pedido, a resposta é uma recusa explícita com sugestão dos objetivos
   disponíveis — nunca uma tentativa de "inventar" um template.
4. `PersonalizationService` substitui apenas os campos do template marcados
   como personalizáveis (`{{nome}}`, `{{situacao}}`, diretivas de ritmo) —
   nunca a estrutura, indução ou sugestões centrais. Devolve uma
   `TherapySession` com o conteúdo personalizado, guardado encriptado.

## Porque não Prisma "livre" para conteúdo clínico

Optou-se por representar o corpo do template como JSON estruturado com secções
nomeadas (`induction`, `core_suggestions`, `anchor_phrases`, `closing`) em vez
de texto livre, precisamente para que a camada de personalização só possa
tocar em placeholders explícitos dentro dessas secções, nunca reescrever a
secção inteira.
