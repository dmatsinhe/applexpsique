# Deteção de sinais de crise — processo e limites

Requisito de segurança inegociável (secção 5 do briefing). Este documento
descreve o que está implementado no MVP, o que falta antes de qualquer
lançamento, e porquê.

## O que está implementado

- `HeuristicCrisisClassifier` (`src/modules/crisis/heuristic-crisis-classifier.ts`):
  classificador baseado em léxico PT-PT, três níveis (`CLEAR`, `AMBIGUOUS`,
  `ABSENT`), corre sobre cada resposta de texto livre do check-in.
- `CrisisService.evaluate`: combina o nível mais severo entre todas as
  respostas de uma submissão, regista um evento de auditoria anonimizado por
  texto avaliado, e devolve a decisão — nunca aconselha, só mostra recursos
  (secção 5: "em nenhum nível a IA tenta 'resolver' ou 'acalmar'").
- `PT_CRISIS_RESOURCES`: SNS 24, SOS Voz Amiga, 112 — específicos de
  Portugal, nunca uma lista genérica internacional.
- Auditoria (`crisis_events`): hash do texto, não o texto em claro; nível
  detetado; versão do classificador. Nunca lido por fluxos de produto.
- Corpus de teste inicial (`test/crisis-corpus/`) e verificação automática
  da taxa de falsos negativos em CI (`crisis-classifier.test.ts`).

## O que NÃO está feito — obrigatório antes de lançar

O briefing é explícito: **"não lançar apenas porque 'parece estar a
funcionar' em testes informais"**. O que está aqui é um ponto de partida de
engenharia, não uma validação clínica. Antes de qualquer lançamento:

1. **Expandir o corpus** com a fundadora (ou outro profissional clínico
   licenciado): exemplos reais/sintéticos adicionais de linguagem de crise
   em português europeu, incluindo eufemismos e linguagem indireta comuns em
   PT/PALOP que a engenharia sozinha não vai conseguir enumerar de forma
   fiável. O ficheiro `test/crisis-corpus/corpus.ts` está estruturado para
   receber esses casos sem alterar código.
2. **Definir o limiar mínimo aceitável de falsos negativos** por critério
   clínico — não é uma decisão de engenharia. O teste atual
   (`crisis-classifier.test.ts`) usa um limiar provisório de
   engenharia (`MAX_ACCEPTABLE_FALSE_NEGATIVE_RATE = 0`, ou seja, zero falsos
   negativos tolerados no corpus atual) só para que o pipeline falhe
   ruidosamente em vez de "passar silenciosamente" — isto não é o limiar de
   lançamento real e tem de ser revisto e substituído por alguém com
   formação clínica antes do lançamento.
3. **Avaliar se um classificador de léxico chega**, ou se é necessário um
   modelo mais robusto (ex: um classificador assistido por Claude com prompt
   de sistema estrito, focado só em classificação, nunca em
   aconselhamento). A interface `CrisisClassifier` foi desenhada para que
   essa troca não exija tocar em `CrisisService` nem nas rotas.
4. **Processo de revisão periódica**: alguém tem de rever regularmente os
   `crisis_events` (nível detetado vs. contexto reportado por utilizadores,
   quando disponível) para calibrar o classificador ao longo do tempo. Isto
   não está automatizado — é um processo humano que a auditoria em base de
   dados suporta, mas não substitui.

## Decisão de desenho: preferir falso positivo a falso negativo

Onde a fronteira entre `AMBIGUOUS` e `ABSENT` for incerta, o classificador
heurístico está inclinado a classificar como `AMBIGUOUS`. O custo de um
falso positivo é um momento de fricção (recursos mostrados
desnecessariamente); o custo de um falso negativo é não mostrar recursos a
alguém que precisava deles. Esta assimetria é intencional e deve
manter-se em qualquer classificador que substitua o atual.
