# Deteção de sinais de crise — processo e limites

Requisito de segurança inegociável (secção 5 do briefing, versão revista).
Este documento descreve o que está implementado no MVP, o que falta antes
de qualquer lançamento, e porquê.

## O que está implementado

- `HeuristicCrisisClassifier` (`src/modules/crisis/heuristic-crisis-classifier.ts`):
  classificador baseado em léxico PT-PT, três níveis (`CLEAR`, `AMBIGUOUS`,
  `ABSENT`), corre sobre cada resposta de texto livre do check-in.
- **Estrutura inspirada no C-SSRS/Columbia Protocol** (`crisis-lexicon.ts`):
  em vez de uma lista de frases plana a crescer indefinidamente, as
  entradas do léxico são organizadas por dimensão de risco — ideação
  passiva, ideação ativa, plano, intenção, comportamento preparatório —
  espelhando as dimensões do instrumento com mais validação empírica
  publicada para rastreio de risco suicida. Mapeamento de severidade:
  - `IDEATION_PASSIVE` (desejo de morrer/desistir sem ideação suicida
    ativa) → nível **AMBIGUOUS**.
  - `IDEATION_ACTIVE`, `PLAN`, `INTENT`, `PREPARATORY_BEHAVIOR` → nível
    **CLEAR**.

  Isto **não é uma implementação certificada do C-SSRS completo** (que é um
  instrumento de entrevista clínica estruturada, não um classificador de
  texto automático) — é a lógica de organização por dimensão a validar com
  parecer clínico, não o texto exato de cada frase.
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
  comunicado de forma explícita e visível sempre que um sinal (CLARO ou
  AMBÍGUO) é detetado (`noRealTimeSupervisionNotice`), nunca escondido
  atrás de um ecrã genérico de recursos. Esta decisão remove o ponto de
  falha único de uma versão anterior do design, que dependia da fundadora
  como único canal de resposta em tempo real — em vez de gerir esse risco,
  deixou de se prometer algo que a app não conseguia garantir.
- Auditoria (`crisis_events`): hash do texto, não o texto em claro; nível
  detetado; versão do classificador. Nunca lido por fluxos de produto.
- Corpus de teste inicial (`test/crisis-corpus/`) e verificação automática
  da taxa de falsos negativos em CI (`crisis-classifier.test.ts`).

## O que NÃO está feito — obrigatório antes de lançar

O briefing é explícito: **"não lançar apenas porque 'parece estar a
funcionar' em testes informais"**. O que está aqui é um ponto de partida de
engenharia, não uma validação clínica. Antes de qualquer lançamento:

1. **Validar a estrutura por dimensão com parecer clínico** — confirmar que
   o mapeamento de severidade (ideação passiva → AMBIGUOUS; ideação ativa/
   plano/intenção/comportamento preparatório → CLEAR) está clinicamente
   correto, e não apenas uma aproximação de engenharia razoável.
2. **Expandir o léxico por dimensão** com a fundadora (ou outro profissional
   clínico licenciado): exemplos reais/sintéticos adicionais de linguagem
   de crise em português europeu, incluindo eufemismos e linguagem indireta
   comuns em PT/PALOP, classificados na dimensão C-SSRS correta — não
   apenas "mais frases", mas frases atribuídas à dimensão certa. O ficheiro
   `test/crisis-corpus/corpus.ts` está estruturado para receber esses casos
   sem alterar código.
3. **Definir o limiar mínimo aceitável de falsos negativos** por critério
   clínico — não é uma decisão de engenharia. O teste atual
   (`crisis-classifier.test.ts`) usa um limiar provisório de
   engenharia (`MAX_ACCEPTABLE_FALSE_NEGATIVE_RATE = 0`, ou seja, zero falsos
   negativos tolerados no corpus atual) só para que o pipeline falhe
   ruidosamente em vez de "passar silenciosamente" — isto não é o limiar de
   lançamento real e tem de ser revisto e substituído por alguém com
   formação clínica antes do lançamento.
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
6. **Preencher o contacto real da fundadora** (`founder-profile.ts`) e
   completar a lista de apoio profissional regional (ver
   `docs/interno/classificação-sinais-crise.md`) antes do lançamento em
   Portugal, e pesquisar/validar os equivalentes antes de expandir a
   qualquer país do PALOP ou ao Brasil.

## Decisão de desenho: preferir falso positivo a falso negativo

Onde a fronteira entre `AMBIGUOUS` e `ABSENT` for incerta, o classificador
heurístico está inclinado a classificar como `AMBIGUOUS`. O custo de um
falso positivo é um momento de fricção (recursos mostrados
desnecessariamente); o custo de um falso negativo é não mostrar recursos a
alguém que precisava deles. Esta assimetria é intencional e deve
manter-se em qualquer classificador que substitua o atual.
