# Deteção de sinais de crise — processo e limites

Requisito de segurança inegociável (secção 5 do briefing, versão revista).
Este documento descreve o que está implementado no MVP, o que falta antes
de qualquer lançamento, e porquê.

## O que está implementado

- `HeuristicCrisisClassifier` (`src/modules/crisis/heuristic-crisis-classifier.ts`):
  classificador baseado em léxico PT-PT, corre sobre cada resposta de texto
  livre do check-in.
- **Taxonomia revista clinicamente pela fundadora** (agosto de 2026, sobre
  a estrutura inicial inspirada no C-SSRS/Columbia Protocol —
  `crisis-lexicon.ts`). A primeira versão agrupava ideação, intenção,
  plano, preparação e autolesão no mesmo nível binário — a revisão corrigiu
  isto por perder distinções clinicamente importantes. Estrutura atual,
  cinco níveis:
  - `ABSENT` — sem sinal.
  - `AMBIGUOUS` (dimensão `IDEATION_PASSIVE`) — desejo passivo de morrer/
    desistir, eufemismos, sem menção direta a suicídio. Mostra recursos +
    reconhecimento explícito, oferece continuar.
  - `DIRECT_MENTION` (dimensão `IDEATION_DIRECT`) — menção direta a
    suicídio, incluindo expressões "semanticamente ambíguas" (ex: "quero
    acabar com tudo") que a fundadora identificou como não devendo ir
    automaticamente ao nível mais grave. Dispara uma **pergunta de
    esclarecimento automatizada** ("Quando diz isso, está a pensar em
    suicídio neste momento?") — nunca uma avaliação humana, sempre a
    resposta da própria pessoa a decidir a gravidade final.
  - `SELF_HARM` (dimensão `SELF_HARM`) — autolesão atual ou desejada,
    **categoria própria**, distinta de ideação suicida (pode existir com ou
    sem intenção de morrer). Pergunta de esclarecimento própria: "Quando
    isso aconteceu, queria morrer, não queria morrer, ou não tinha a
    certeza?".
  - `CLEAR` (dimensões `INTENT`, `PLAN`, `PREPARATORY_BEHAVIOR`) — intenção
    declarada, plano concreto, ou comportamento de despedida/preparação.
    Vai direto a este nível, sem pergunta intermédia: aqui a combinação já
    é suficientemente grave para não esperar por confirmação.

  Isto **não é uma implementação certificada do C-SSRS completo** (que é um
  instrumento de entrevista clínica estruturada, não um classificador de
  texto automático) — é a lógica de organização por dimensão, revista por
  uma clínica licenciada, não a garantia de que todas as frases estão no
  sítio certo (isso continua a precisar de expansão — ver abaixo).
- **Pergunta de esclarecimento automatizada** para `DIRECT_MENTION` e
  `SELF_HARM` (`CrisisService.buildClarificationPrompt`,
  `CheckInService.resolveCrisisClarification`,
  `POST /checkin/:id/clarify-crisis`): resolve sempre para `CLEAR`
  (escalar, bloqueio permanente) ou `AMBIGUOUS` (descer, oferece
  continuar) — nunca decidida pelo sistema sozinho, sempre pela resposta
  da própria pessoa. Os três blocos de recursos são mostrados **sempre**,
  mesmo antes de a pergunta ser respondida.
- `CrisisService.evaluate`: combina o nível mais severo entre todas as
  respostas de uma submissão, regista um evento de auditoria anonimizado por
  texto avaliado, e devolve a decisão — nunca aconselha, só mostra recursos
  (secção 5: "em nenhum nível a IA tenta 'resolver' ou 'acalmar'").
- **Resposta de crise em três blocos separados** (`crisis-resources.ts`,
  detalhado em `docs/interno/classificação-sinais-crise.md`): recursos de
  crise imediatos (Linha 1411, 112), apoio profissional na área do
  utilizador (encaminhamento), e contacto privado da fundadora — este
  último rotulado inequivocamente como sugestão de marcação de consulta,
  nunca como canal de resposta a crise. Nunca fundidos numa única frase.
- **Sem promessa de supervisão em tempo real** (decisão revista): a app
  não notifica ninguém automaticamente em caso de sinal de risco. Isto é
  comunicado de forma explícita e visível sempre que qualquer sinal acima
  de `ABSENT` é detetado (`noRealTimeSupervisionNotice`), nunca escondido
  atrás de um ecrã genérico de recursos. A pergunta de esclarecimento em
  `DIRECT_MENTION`/`SELF_HARM` é também sempre automatizada — nunca finge
  que há alguém do outro lado a avaliar a resposta.
- Auditoria (`crisis_events`): hash do texto, não o texto em claro; nível
  detetado; versão do classificador. Nunca lido por fluxos de produto.
- Corpus de teste (`test/crisis-corpus/`) e verificação automática da taxa
  de falsos negativos em CI (`heuristic-crisis-classifier.test.ts`),
  incluindo um teste dedicado a garantir que `CLEAR`, `DIRECT_MENTION` e
  `SELF_HARM` nunca colapsam no mesmo nível.

## O que NÃO está feito — obrigatório antes de lançar

O briefing é explícito: **"não lançar apenas porque 'parece estar a
funcionar' em testes informais"**. O que está aqui é um ponto de partida de
engenharia com uma primeira revisão clínica da estrutura, não uma
validação clínica completa. Antes de qualquer lançamento:

1. **Expandir o léxico por dimensão** com a fundadora (ou outro profissional
   clínico licenciado): a lista atual de frases por dimensão foi corrigida
   e alargada numa primeira revisão, mas a própria fundadora notou que "não
   constituem um léxico culturalmente validado" — faltam entrevistas com
   psicólogos e falantes locais de Moçambique e Portugal, e testes com
   falantes das regiões abrangidas (referências espirituais/religiosas,
   alternância com línguas locais, etc.). O ficheiro
   `test/crisis-corpus/corpus.ts` está estruturado para receber esses casos
   sem alterar código.
2. **Definir o limiar mínimo aceitável de falsos negativos** por critério
   clínico — não é uma decisão de engenharia. O teste atual
   (`heuristic-crisis-classifier.test.ts`) usa um limiar provisório de
   engenharia (`MAX_ACCEPTABLE_FALSE_NEGATIVE_RATE = 0`, ou seja, zero falsos
   negativos tolerados no corpus atual) só para que o pipeline falhe
   ruidosamente em vez de "passar silenciosamente" — isto não é o limiar de
   lançamento real e tem de ser revisto e substituído por alguém com
   formação clínica antes do lançamento.
3. **Validar o texto exato das perguntas de esclarecimento** e das opções
   de resposta com critério clínico — a redação atual segue a orientação da
   fundadora e a recomendação da OMS de perguntar diretamente sobre
   pensamentos, planos e atos de autolesão/suicídio, mas não foi testada
   com utilizadores reais.
4. **Avaliar se um classificador de léxico chega**, ou se é necessário um
   modelo mais robusto (ex: um classificador assistido por Claude com prompt
   de sistema estrito, focado só em classificação por dimensão, nunca em
   aconselhamento). A interface `CrisisClassifier` foi desenhada para que
   essa troca não exija tocar em `CrisisService` nem nas rotas.
5. **Processo de revisão periódica**: alguém tem de rever regularmente os
   `crisis_events` (nível e dimensão detetados vs. contexto reportado por
   utilizadores, quando disponível) para calibrar o classificador ao longo
   do tempo. Isto não está automatizado — é um processo humano que a
   auditoria em base de dados suporta, mas não substitui.
6. **Completar a lista de apoio profissional regional** (ver
   `docs/interno/classificação-sinais-crise.md`) antes do lançamento em
   Portugal, e pesquisar/validar os equivalentes antes de expandir a
   qualquer país do PALOP ou ao Brasil.

## Decisão de desenho: preferir falso positivo a falso negativo

Onde a fronteira entre níveis for incerta, o classificador heurístico está
inclinado a classificar como mais grave. O custo de um falso positivo é um
momento de fricção (recursos mostrados desnecessariamente, ou uma pergunta
de esclarecimento a mais); o custo de um falso negativo é não mostrar
recursos a alguém que precisava deles. Esta assimetria é intencional e
deve manter-se em qualquer classificador que substitua o atual.

## Decisão de desenho: pergunta de esclarecimento nunca é "avaliação humana"

A revisão clínica original propunha que menções diretas a suicídio
"interrompam e iniciem avaliação humana". A app, tal como está construída,
**não tem nenhum humano disponível em tempo real** — foi essa exatamente a
razão pela qual a secção 5 removeu a promessa de notificação à fundadora
(ver decisão acima). A tradução acordada: em vez de uma avaliação humana
inexistente, a app faz uma pergunta de esclarecimento automatizada e deixa
a resposta da própria pessoa decidir se o sinal escala ou desce de
gravidade — nunca finge ter alguém do outro lado. Os recursos de crise são
sempre mostrados antes, durante e depois desta pergunta, independentemente
da resposta.
