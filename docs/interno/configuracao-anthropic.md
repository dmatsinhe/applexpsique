<!--
Documento interno — guia passo a passo para a fundadora criar a conta na
Anthropic e gerar a chave que liga a personalização por IA da situação
(reescrita, dentro dos limites descritos no ecrã "Como isto funciona").
Não é preciso saber programação para seguir isto.
-->

# Configurar a chave da Anthropic — personalização por IA (2026-08-18)

## O que vai acontecer com esta chave

Quando alguém preencher "há alguma situação específica que gostaria que a
sessão tivesse em conta?" no check-in, e tiver o plano Premium, a app pede
à IA (Claude) para reescrever essa frase de forma mais suave antes de a
encaixar na abertura da sessão — nunca inventa informação nova, nunca dá
conselhos, só torna a frase da própria pessoa mais fluida. Sem a chave
configurada, ou se a IA falhar por qualquer razão, a app usa a frase
exatamente como a pessoa escreveu — nunca bloqueia a sessão à espera da
IA.

Custo esperado: muito baixo (o modelo usado, Claude Haiku, custa cêntimos
por milhares de reescritas) — mas é pago à Anthropic diretamente, por
cartão associado à conta.

## Passo 1 — Criar a conta

1. Vai a **console.anthropic.com** e cria uma conta com o email do
   negócio.
2. Confirma o email quando pedido.

## Passo 2 — Associar um método de pagamento

Em **Settings → Billing**, adiciona um cartão. A Anthropic cobra por
utilização (não é uma mensalidade fixa) — só pagas pelo que a app
realmente usar.

Podes definir um limite de gasto mensal em **Settings → Limits**, para
nunca haver surpresas — recomendo começar com um limite baixo (ex: 5-10
USD) e ajustar depois de veres o consumo real.

## Passo 3 — Gerar a chave da API

1. Vai a **Settings → API Keys → Create Key**.
2. Dá-lhe um nome que reconheças (ex: "CuidaMente produção").
3. Copia a chave — começa por `sk-ant-...`. A Anthropic só a mostra uma
   vez; se a perderes, crias outra.

## Passo 4 — Enviar-me a chave

Cola aqui a chave (`sk-ant-...`). Configuro-a no Render (nunca fica
escrita no código nem no repositório, que é público) e testamos a
reescrita de ponta a ponta.

## O que fica de fora, por agora

Só a reescrita da situação está ligada à IA. Ritmo e frases-âncora
continuam a ser escolhidos como hoje (a pessoa escolhe o ritmo; todas as
frases-âncora são usadas por igual) — podemos ligar isso também mais
tarde, se quiseres.
