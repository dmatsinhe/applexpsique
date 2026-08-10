# Lexpsique

Aplicação de hipnose clínica e apoio psicológico da Lexpsique, Lda. Ver
`docs/architecture.md` e `docs/database-schema.md` para a arquitetura
completa, e `docs/crisis-detection.md` para o estado e limites do
classificador de crise.

## Estado atual

MVP passo 1 implementado e testado: registo com verificação de idade
explícita → check-in com deteção de crise obrigatória (estrutura inspirada
no C-SSRS, ver `docs/crisis-detection.md`) → correspondência a template
aprovado (ou recusa explícita) → personalização dentro dos limites do
template → sessão renderizada, com retoma de posição de áudio.

Em caso de sinal de crise, a app nunca promete supervisão humana em tempo
real — mostra sempre três blocos separados (recursos imediatos, apoio
profissional regional, contacto privado da fundadora explicitamente rotulado
como não-resposta-a-crise) e um aviso explícito de que ninguém é notificado
automaticamente. Ver `docs/interno/classificação-sinais-crise.md`.

**Antes de qualquer lançamento real**, ver `docs/crisis-detection.md`: o
classificador de crise atual é um ponto de partida de engenharia, não uma
validação clínica, e os templates seed são placeholders de desenvolvimento
explicitamente não aprovados.

O utilizador pode exportar ou apagar os próprios dados a qualquer momento
(secção 8), sem pedir a ninguém — ecrã "A minha conta", visível depois de
autenticado, ou diretamente via `GET /account/export`, `DELETE
/account/history` e `DELETE /account`.

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

## Deploy de demonstração (Render)

`render.yaml` na raiz do repositório é um Blueprint do [Render](https://render.com)
que cria três serviços no plano gratuito: base de dados Postgres, backend, e
o frontend como site estático. **Isto é só para veres a app a correr numa
URL real — não é configuração de produção** (ver avisos em `docs/`).

Passos (feitos por ti no teu browser — nenhum segredo passa por aqui):

1. Entra em [dashboard.render.com](https://dashboard.render.com) e cria
   conta (ou entra na que já tiveres), ligando o teu GitHub.
2. **New** → **Blueprint**.
3. Escolhe o repositório `dmatsinhe/applexpsique` e confirma o branch
   `claude/new-session-43gdhg`.
4. O Render lê o `render.yaml` e mostra os três serviços a criar. Confirma.
5. Espera o deploy (uns minutos — o backend corre as migrações da base de
   dados automaticamente no arranque).
6. A URL do frontend fica em `https://lexpsique-demo-frontend.onrender.com`
   (ou o nome que o Render tiver atribuído, se este já estiver ocupado —
   nesse caso atualiza manualmente `CORS_ORIGINS` no backend e
   `VITE_API_BASE_URL` no frontend nas definições do serviço).

Avisos do plano gratuito: o backend "adormece" após inatividade (o primeiro
pedido depois disso demora mais); a base de dados Postgres grátis expira ao
fim de 90 dias.

Depois do deploy, tal como localmente, nenhum template está aprovado — a
app vai recusar todas as sessões até aprovares um manualmente pelo endpoint
de admin (ver secção acima, trocando `localhost:3000` pela URL do backend
no Render).
