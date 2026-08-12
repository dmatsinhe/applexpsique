<!--
Documento interno — guia passo a passo para a fundadora configurar a
conta Stripe que liga os pagamentos reais da CuidaMente (Portugal e
Brasil, ver docs/interno/preco-e-nome.md). Não é preciso saber
programação para seguir isto.
-->

# Configurar a conta Stripe — pagamentos (2026-08-12)

## O que já está pronto no código

O backend já sabe criar sessões de pagamento (cartão, PayPal, Multibanco),
processar a confirmação, atualizar o plano da conta para Premium, e deixar
cancelar pelo portal do Stripe. Só falta uma coisa: a tua conta Stripe e
as chaves que ela gera. Sem isso configurado, a app funciona
normalmente — só o botão "Subscrever" mostra uma mensagem de "ainda não
disponível" em vez de abrir o pagamento.

## Porque só Portugal e Brasil por agora

A tua empresa (Lexpsique, Lda.) está sediada em Portugal, e é isso que
define o "país" da tua conta Stripe. Isso tem uma consequência importante
para o Brasil: **Pix e Boleto não vão estar disponíveis nesta primeira
fase** — são métodos que exigem uma conta Stripe domiciliada no Brasil
(atualmente por convite). Para o Brasil, à partida, fica cartão e PayPal.
Quando isso fizer sentido financeiramente, criamos uma segunda ligação
(conta Stripe Brasil, ou outro processador local) só para Pix/Boleto —
fica registado aqui como próximo passo, não é preciso decidir agora.

## Passo 1 — Criar a conta

1. Vai a **stripe.com** e cria uma conta com o email do negócio.
2. Em "Detalhes do negócio", preenche:
   - País: **Portugal**
   - Nome legal: **Lexpsique, Lda.**
   - NIF e morada da empresa
   - Categoria: algo como "Saúde e bem-estar" ou "Software/SaaS"
3. Vais precisar de um IBAN (para receberes os pagamentos) e de verificar
   identidade — o Stripe pede isto antes de ativares o modo "Live"
   (dinheiro real). Podes deixar isto para mais tarde e continuar já com
   o **modo de teste**, que não pede verificação.

## Passo 2 — Ativar os métodos de pagamento

No dashboard, em **Settings → Payment methods**:

- **Cartão** — já vem ativo.
- **PayPal** — ativa aqui. Pode pedir para autorizares pagamentos
  recorrentes (subscrições) separadamente — se aparecer essa opção, ativa
  também.
- **Multibanco** — ativa aqui (só aparece para contas em EUR/Portugal).

## Passo 3 — Criar os planos (Products)

Em **Product catalog → Add product**, cria dois produtos:

**CuidaMente Premium — Portugal**
- Preço recorrente mensal: 5,99 EUR
- Preço recorrente anual: 49,99 EUR

**CuidaMente Premium — Brasil**
- Preço recorrente mensal: 19,90 BRL
- Preço recorrente anual: 159,90 BRL

Cada preço tem um ID que começa por `price_...` — vais precisar dos 4
(guarda-os, é o que me vais enviar no Passo 5).

## Passo 4 — Criar o webhook

Em **Developers → Webhooks → Add endpoint**:

- URL: `https://lexpsique-demo-backend.onrender.com/billing/webhook`
- Eventos a enviar: `checkout.session.completed`,
  `customer.subscription.created`, `customer.subscription.updated`,
  `customer.subscription.deleted`

Depois de criado, o Stripe mostra um "Signing secret" que começa por
`whsec_...` — guarda-o também.

## Passo 5 — Enviar-me as chaves (modo de teste primeiro)

Em **Developers → API keys**, confirma que estás em **modo de teste**
(interruptor no canto superior direito) e copia:

- Publishable key (`pk_test_...`) — não é preciso, mas não faz mal enviar
- Secret key (`sk_test_...`)

Envia-me:
1. `sk_test_...` (Secret key)
2. `whsec_...` (Signing secret do webhook)
3. Os 4 `price_...` (mensal/anual × Portugal/Brasil)

Eu configuro isto no Render (nunca fica escrito no código nem no
repositório) e testamos uma subscrição de ponta a ponta em modo de teste
— sem qualquer cobrança real, o Stripe disponibiliza números de cartão
fictícios para isso.

## Passo 6 — Passar a "Live" (dinheiro real)

Só depois de testarmos e tu quereres avançar: completas a verificação de
identidade/IBAN pendente do Passo 1, repetes o Passo 5 mas com o
interruptor em **modo Live** (chaves `sk_live_...` e um novo webhook
apontado à mesma URL, também em modo Live), e enviamos-me as chaves Live
para trocar no Render. A partir desse momento os pagamentos são reais.

## Nota sobre Multibanco e subscrições

O Multibanco não permite guardar o método de pagamento para cobranças
futuras automáticas (é uma referência que a pessoa paga manualmente no
banco/multibanco). Isto significa que, para quem escolhe pagar por
Multibanco, a renovação do plano não é 100% automática — o Stripe envia
uma fatura por email a pedir o pagamento da renovação, em vez de cobrar
sozinho. É o comportamento normal deste método em qualquer país, não é um
problema do nosso código.

## Moçambique — PayPal, M-Pesa, e-Mola (pagamento manual)

Ao contrário de Portugal/Brasil, Moçambique **não passa pelo Stripe**.
M-Pesa e e-Mola não têm um gateway de pagamento automático que se possa
ligar por código — uma ligação automática exigiria um contrato direto
com a Vodacom (M-Pesa) ou a Movitel (e-Mola), algo que não se resolve só
com programação. Por isso este mercado usa um fluxo manual:

1. Na página de Preços, a pessoa escolhe PayPal, M-Pesa ou e-Mola, vê o
   valor e o teu contacto (email PayPal / número M-Pesa / número e-Mola),
   faz a transferência por fora da app, e submete a referência ou
   comprovativo na app.
2. Isso cria um "pedido pendente" — a conta continua no plano Grátis até
   alguém confirmar.
3. Tu confirmas com a tua chave de administração (`ADMIN_API_KEY`, a
   mesma usada para aprovar os guiões clínicos):

```bash
# Ver pedidos pendentes
curl https://lexpsique-demo-backend.onrender.com/admin/manual-payment-requests \
  -H "x-admin-key: A_TUA_CHAVE"

# Depois de confirmares o pagamento na tua conta PayPal/M-Pesa/e-Mola,
# aprovar (ativa o Premium na hora):
curl -X POST https://lexpsique-demo-backend.onrender.com/admin/manual-payment-requests/ID_DO_PEDIDO/approve \
  -H "x-admin-key: A_TUA_CHAVE" \
  -H "Content-Type: application/json" \
  -d '{"reviewedBy": "o-teu-email"}'

# Ou rejeitar, se a referência não bater certo:
curl -X POST https://lexpsique-demo-backend.onrender.com/admin/manual-payment-requests/ID_DO_PEDIDO/reject \
  -H "x-admin-key: A_TUA_CHAVE" \
  -H "Content-Type: application/json" \
  -d '{"reviewedBy": "o-teu-email", "note": "referência não encontrada"}'
```

Ao aprovar, a conta passa a Premium por 30 dias (mensal) ou 365 dias
(anual) a partir desse momento. **A renovação em si continua manual**
(a pessoa tem de voltar a pagar e submeter uma nova referência), mas a
app já trata da desativação e do aviso sozinha:

- **Aviso ao cliente**: a partir de 3 dias antes da data de renovação,
  a pessoa vê um aviso dentro da app ("A sua subscrição expira em X
  dias") com um link direto para a página de Preços.
- **Desativação automática**: se a data de renovação passar sem um novo
  pagamento aprovado, a conta volta sozinha ao plano Grátis — não
  precisas de fazer nada. Isto acontece assim que alguém "olha" para o
  estado dessa conta (o próprio cliente ao abrir a app, ou tu ao
  consultares a lista de pedidos), não é um relógio a correr em
  segundo plano.
- **Aviso para ti**: para veres quem está prestes a expirar (útil para
  fazeres um lembrete manual, já que não há envio de email):

```bash
curl https://lexpsique-demo-backend.onrender.com/admin/manual-payment-requests/expiring-soon \
  -H "x-admin-key: A_TUA_CHAVE"
```

Quando a pessoa pagar de novo e aprovares o novo pedido (mesmo processo
de sempre), a conta volta a Premium com uma nova data de renovação —
não é preciso nenhum passo extra por ter expirado entretanto.

Os contactos de receção (email PayPal, números M-Pesa/e-Mola) estão
configurados como variáveis de ambiente no Render
(`PAYPAL_RECEIVE_EMAIL`, `MPESA_RECEIVE_NUMBER`, `EMOLA_RECEIVE_NUMBER`)
— podes mudá-los lá diretamente se os números mudarem, sem precisar de
mexer no código.
