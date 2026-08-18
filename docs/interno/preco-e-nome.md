<!--
Documento interno — decisões de negócio da fundadora, registadas para
referência. NÃO é uma especificação técnica nem implica que exista
qualquer sistema de subscrição/pagamento construído — não existe.
-->

# Nome e preços — decisões da fundadora (2026-08-11)

## Nome

**CuidaMente**, uma aplicação **LexPsique, Lda.**

Aplicado em toda a app: título, ecrã de registo, manifesto PWA, política
de privacidade, README e documentação técnica. Os nomes internos dos
serviços no Render (`lexpsique-demo-*`) e o URL de demonstração
(`lexpsique-demo-frontend.onrender.com`) foram deliberadamente mantidos
como estão — mudá-los implicaria recriar/renomear serviços já em
produção, com um novo URL e possível período de indisponibilidade.
Decisão pendente: renomear a infraestrutura Render mais tarde, ou manter
o nome interno diferente do nome público (prática comum).

## Modelo de preços proposto

| Mercado | Mensal | Anual |
|---|---|---|
| Portugal | €5,99 | €49,99 |
| Brasil | R$19,90 | R$159,90 |
| Moçambique | 199 MT | 1.590 MT |
| Angola | 2.500 Kz | 19.900 Kz |
| Cabo Verde | 399 CVE | 3.190 CVE |
| Guiné-Bissau | 1.500 XOF | 11.900 XOF |
| São Tomé e Príncipe | 99 STN | 790 STN |
| Timor-Leste | US$3,99 | US$31,99 |
| Guiné Equatorial | 2.500 XAF | 19.900 XAF |

Valores propostos pela fundadora, sujeitos a validação com utilizadores
e às taxas das lojas de aplicações.

### Planos

- **Gratuito** — registo emocional diário, conteúdos introdutórios, um
  exercício de bem-estar por dia, acesso limitado às ferramentas.
- **CuidaMente Premium** — todos os exercícios e programas, diário
  emocional completo, áudios de relaxamento, relatórios de evolução,
  conteúdos personalizados, comunidade/sessões coletivas (se aplicável).
- **Consultas com psicólogos** — cobradas à parte, nunca incluídas na
  mensalidade (evita elevar o preço base e evita obrigações
  profissionais/legais distintas por país).

### Lançamento (primeiros 60 dias)

- 7 dias grátis;
- 40% de desconto no primeiro ano;
- preço especial para os primeiros 500 membros;
- programa "indique uma pessoa e ganhe um mês";
- exemplo Moçambique: 199 MT/mês normal → 990 MT no primeiro ano
  (oferta de fundadores).

### Posicionamento

"CuidaMente by LexPsique — Grátis para começar. Premium a partir do
equivalente a €2–€6 por mês, conforme o país." Nunca prometer cura nem
substituir acompanhamento profissional.

### Ordem de mercados sugerida

Moçambique, Angola, Portugal e Brasil primeiro — validar adesão e
retenção durante três meses antes de expandir aos restantes.
Portugal/Brasil geram receita; Moçambique reforça a autoridade de
origem de Dália Matsinhe; Angola é expansão regional natural.

## Estado de implementação

Subscrição e distinção de planos Grátis/Premium já estão implementadas
(2026-08-12, revisto 2026-08-18). Portugal, Brasil e Moçambique pagam
todos pelo mesmo mecanismo — PayPal, transferência bancária, e também
M-Pesa/e-Mola em Moçambique — com confirmação manual pela fundadora
(sem gateway automático; ver docs/interno/configuracao-pagamentos.md).
Decisão deliberada: como a empresa é moçambicana e nenhum grande
processador de pagamentos com subscrição automática (Stripe incluído)
opera em Moçambique, ligar um exigiria uma conta pessoal da fundadora
noutro país — evitou-se isso mantendo tudo manual. Os restantes
mercados (Angola, Cabo Verde, Guiné-Bissau, São Tomé e Príncipe,
Timor-Leste, Guiné Equatorial) continuam só informativos na página de
preços, sem forma de pagar ainda.
