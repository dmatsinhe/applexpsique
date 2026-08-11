# Esquema de base de dados — CuidaMente

Fonte de verdade: `backend/prisma/schema.prisma`. Este documento explica o
"porquê" de cada decisão de modelação, ligada a um requisito concreto do
produto.

## `users`

- `isAdultVerified` / `ageVerifiedAt` em vez de `birthDate`: a secção 5.1
  exige confirmação explícita de idade, mas não exige (nem devíamos querer)
  reter a data de nascimento completa indefinidamente. O fluxo de registo
  pede a data de nascimento, valida 18+, e só persiste o resultado booleano
  + timestamp — minimização de dados sensíveis (secção 8).
- **Não existe nenhum campo de consentimento de notificação de crise.** Uma
  versão anterior deste schema tinha `crisisNotifyOnClearSignal` (nullable,
  sem valor por defeito) para o utilizador escolher se a fundadora seria
  notificada em tempo real em caso de sinal claro. A secção 5 (versão
  revista) removeu essa promessa por completo — a app nunca notifica
  ninguém automaticamente, por isso não há nada para consentir aqui. Ver
  `docs/crisis-detection.md` para a decisão completa.

## `session_templates` + `template_versions`

Separados em duas tabelas propositadamente:

- `SessionTemplate` é a identidade estável de "o template para X objetivo"
  (ex: sono).
- `TemplateVersion` é uma versão concreta e imutável desse template, com
  `status` (`DRAFT` / `APPROVED` / `RETIRED`), `approvedBy`, `approvedAt`.

Isto implementa diretamente o requisito da secção 1: "alterações a um
template exigem nova aprovação antes de substituir a versão em produção —
nada de edição silenciosa em produção." Editar conteúdo aprovado nunca
faz `UPDATE` numa `TemplateVersion` existente — cria-se sempre uma nova
linha com `version` incrementada e `status = DRAFT`, que só passa a
`isActive = true` depois de `approvedBy`/`approvedAt` serem preenchidos.
Só pode haver uma `TemplateVersion` com `isActive = true` por
`SessionTemplate` — isto é aplicado em código (`TemplateRepository`), não só
por constraint de schema, porque a transição de qual versão está ativa é uma
operação transacional com significado de negócio (aprovação clínica).

`content` é `Json` estruturado por secções nomeadas
(`induction`, `coreSuggestions`, `anchorPhrases`, `closing`,
`personalizableFields`) em vez de uma string livre. Isto é o que torna
impossível, a nível de dados, a camada de personalização reescrever a
estrutura terapêutica: o código de personalização só tem acesso de escrita
aos campos listados em `personalizableFields`.

Não existe template para perfis clínicos incompatíveis com técnicas
genéricas (ex. TOC) até existir uma `TemplateVersion` aprovada
especificamente para esse objetivo — a ausência de linha na tabela **é** o
mecanismo de segurança, não uma verificação adicional que possa ser
esquecida.

## `check_ins`

- `answersEncrypted`: as respostas de texto livre do check-in podem conter
  informação clínica sensível, logo são encriptadas a nível de aplicação
  (AES-256-GCM, `lib/encryption.ts`) antes de serem persistidas — não
  dependemos só de encriptação a nível de disco.
- `crisisSignalLevel` é gravado sempre, para todo e qualquer check-in — o
  classificador corre antes de qualquer outra decisão ser tomada, por
  requisito da secção 5.
- `matchedTemplateVersionId` só é preenchido quando `crisisSignalLevel =
  ABSENT` **e** existe uma `TemplateVersion` `APPROVED` e `isActive` para o
  objetivo pedido. `refusedNoTemplateAvailable` regista explicitamente o
  caso em que não existe template disponível — para que a recusa seja
  auditável, não apenas um "não aconteceu nada".

## `crisis_events`

Tabela de auditoria separada de `check_ins`, com propósito único: revisão
periódica de falsos positivos/negativos do classificador (secção 5). Por
isso:

- `inputHash`, nunca o texto em claro — o objetivo é poder medir "quantas
  vezes o classificador disparou nível X esta semana", não reconstruir o que
  a pessoa escreveu.
- `userId` é opcional/nullable por design — para que, se no futuro se decidir
  agregar estatísticas sem ligação a utilizadores identificáveis, o schema já
  suporte isso sem migração.
- Esta tabela nunca é lida por nenhum fluxo de produto — só por ferramentas
  de auditoria/revisão clínica.

## `therapy_sessions`

- `personalization` guarda só os valores concretos usados nos placeholders
  (nome, nota de situação, diretiva de ritmo) — nunca uma cópia alterada da
  estrutura do template. Isto torna trivial auditar, por sessão, exatamente
  o que foi personalizado.
- `renderedContentEncrypted`: o texto final entregue ao utilizador, também
  encriptado em repouso (mesma razão que `check_ins`).
- `resumePositionSeconds` existe especificamente para o requisito da secção
  9 — testar retoma após perda de ligação a meio de uma sessão de áudio, em
  vez de reiniciar do zero. É atualizado periodicamente pelo cliente durante
  a reprodução.

## `voice_preferences`

Schema já preparado (secção 2), mas fora do âmbito funcional do MVP passo 1.
`voiceId` aponta para um catálogo fixo de vozes geridas fora da base de
dados (config), não uma tabela `Voice` separada — não há necessidade de
modelar isso já.

## Índices e chaves não óbvias

- `@@unique([templateId, version])` em `TemplateVersion` — impede duas
  versões com o mesmo número para o mesmo template, reforçando o
  versionamento sequencial.
- `email` único em `User` — óbvio, mas vale registar que a validação de
  força de password e de formato de email fica no `AuthService`, não no
  schema.
