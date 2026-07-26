# Lexpsique

Aplicação de hipnose clínica e apoio psicológico da Lexpsique, Lda. Ver
`docs/architecture.md` e `docs/database-schema.md` para a arquitetura
completa, e `docs/crisis-detection.md` para o estado e limites do
classificador de crise.

## Estado atual

MVP passo 1 implementado e testado: registo com verificação de idade
explícita → consentimento de notificação de crise (sem valor por defeito) →
check-in com deteção de crise obrigatória → correspondência a template
aprovado (ou recusa explícita) → personalização dentro dos limites do
template → sessão renderizada, com retoma de posição de áudio.

**Antes de qualquer lançamento real**, ver `docs/crisis-detection.md`: o
classificador de crise atual é um ponto de partida de engenharia, não uma
validação clínica, e os templates seed são placeholders de desenvolvimento
explicitamente não aprovados.

## Estrutura

- `backend/` — API Node.js + TypeScript + Express + Prisma/PostgreSQL.
- `frontend/` — PWA React + Vite para o fluxo do MVP.
- `docs/` — arquitetura, schema de base de dados, processo de deteção de crise.

## Correr localmente

### Backend

```bash
cd backend
cp .env.example .env   # preencher DATABASE_URL, ENCRYPTION_KEY_BASE64, JWT_SECRET, ADMIN_API_KEY
npm install
npx prisma migrate dev
npx tsx prisma/seed.ts   # cria templates DRAFT de exemplo (nunca aprovados)
npm run dev
```

### Frontend

```bash
cd frontend
cp .env.example .env   # VITE_API_BASE_URL a apontar para o backend
npm install
npm run dev
```

### Testes (backend)

```bash
cd backend
npm test
```

Os testes de integração usam uma base de dados PostgreSQL real (a mesma de
`DATABASE_URL`), incluindo o corpus de teste do classificador de crise em
`test/crisis-corpus/`.

## Aprovar um template (fluxo de desenvolvimento)

Não existe ainda um painel de administração. Para aprovar um template
manualmente durante o desenvolvimento:

```bash
curl -X POST http://localhost:3000/admin/templates/draft \
  -H "x-admin-key: $ADMIN_API_KEY" -H "Content-Type: application/json" \
  -d '{"slug": "...", "clinicalGoal": "SLEEP", "title": "...", "content": { ... }}'

curl -X POST http://localhost:3000/admin/templates/<versionId>/approve \
  -H "x-admin-key: $ADMIN_API_KEY" -H "Content-Type: application/json" \
  -d '{"approvedBy": "nome-da-fundadora"}'
```

O conteúdo clínico em si (indução, sugestões centrais, frases-âncora) tem de
ser escrito e aprovado por um profissional licenciado — este endpoint só
regista essa aprovação, nunca gera o conteúdo.
