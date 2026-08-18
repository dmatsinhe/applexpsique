<!--
Documento interno — como funciona a faturação da CuidaMente e como a
fundadora confirma pagamentos. Não é preciso saber programação para
seguir isto.
-->

# Configuração de pagamentos (2026-08-18)

## Como funciona

A app usa um único mecanismo de pagamento — manual, sem gateway
automático — para os três mercados ativos (Portugal, Brasil e
Moçambique). Não há Stripe nem nenhum outro processador ligado: o
dinheiro entra diretamente no PayPal, na conta bancária da empresa, ou
no M-Pesa/e-Mola, sem intermediário.

Isto foi uma decisão deliberada: a empresa (Lexpsique, Lda.) é
moçambicana, e nenhum dos grandes processadores de pagamento com
subscrições automáticas (Stripe incluído) opera em Moçambique. Ligar um
processador teria exigido abrir uma conta pessoal da fundadora noutro
país (ver a conversa sobre isso), misturando finanças pessoais e da
empresa por causa de uma ferramenta. Manter tudo manual evita esse
problema — o preço é não ter renovação automática por cartão.

## O fluxo, na app

1. Na página de Preços, a pessoa escolhe o mercado (Portugal, Brasil ou
   Moçambique), o método de pagamento disponível para esse mercado, e
   vê o valor e o destino:
   - **Portugal e Brasil**: PayPal ou transferência bancária.
   - **Moçambique**: PayPal, transferência bancária, M-Pesa ou e-Mola.
2. A pessoa transfere por fora da app e submete uma referência ou
   comprovativo.
3. Isso cria um "pedido pendente" — a conta continua no plano Grátis
   até alguém confirmar.
4. A fundadora confirma com a chave de administração (`ADMIN_API_KEY`,
   a mesma usada para aprovar os guiões clínicos):

```bash
# Ver pedidos pendentes
curl https://lexpsique-demo-backend.onrender.com/admin/manual-payment-requests \
  -H "x-admin-key: A_TUA_CHAVE"

# Depois de confirmares o pagamento na tua conta PayPal/banco/M-Pesa/e-Mola,
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

## Renovação, aviso e expiração automática

Ao aprovar, a conta passa a Premium por 30 dias (mensal) ou 365 dias
(anual) a partir desse momento. **A renovação em si é sempre manual**
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

## Dados de contacto/receção

Configurados como variáveis de ambiente no Render (todas em
`lexpsique-demo-backend` → Environment) — podes mudá-las lá
diretamente se algum dado mudar, sem precisar de mexer no código:

| Variável | Valor atual |
|---|---|
| `PAYPAL_RECEIVE_EMAIL` | lexpsiqueism@gmail.com |
| `MPESA_RECEIVE_NUMBER` | 845946215 |
| `EMOLA_RECEIVE_NUMBER` | 871619151 |
| `BANK_NAME` | Nedbank |
| `BANK_ACCOUNT_HOLDER` | Lexpsique, Lda. |
| `BANK_ACCOUNT_NUMBER` | 00012648108 |
| `BANK_NIB` | 0043 0000 0001 2648 1085 5 |
| `BANK_IBAN` | MZ59004300000001264810855 |
| `BANK_SWIFT` | UNICMZMX |

## Se um dia quiseres voltar a ter cartão/renovação automática

O código do Stripe (checkout, portal de subscrição, webhook) foi
removido — não ficou meio-construído, ficou fora por completo, para não
haver dois sistemas a meio caminho. Se o volume de clientes um dia
justificar o esforço de resolver a questão da conta pessoal/empresa
(ver a conversa sobre isso), religar um processador de pagamento é
trabalho novo, não uma reativação — mas o histórico do repositório tem
a implementação anterior como referência, se for útil.
