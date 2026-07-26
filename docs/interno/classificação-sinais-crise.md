# Classificação de sinais de crise — recursos por país (interno)

Documento interno de referência para o conteúdo mostrado em resposta a
sinais de crise (secção 5 do briefing, versão revista). Ver
`backend/src/modules/crisis/crisis-resources.ts` para a implementação e
`docs/crisis-detection.md` para o estado do classificador em si.

## Estrutura obrigatória da resposta

Sempre que um sinal de risco é detetado (CLARO ou AMBÍGUO), a resposta
mostra sempre três blocos separados e claramente identificados — nunca
fundidos numa única frase:

1. **Recursos de crise imediatos** — linha nacional de prevenção do
   suicídio + emergência médica.
2. **Apoio profissional na área do utilizador** — encaminhamento para
   marcação de consulta (clínicas, hospitais, ordens/associações
   profissionais, apoio psicológico online).
3. **Contacto privado da fundadora** — rotulado inequivocamente como
   sugestão de marcação de consulta fora da app, nunca como canal de
   resposta a crise.

A app nunca promete supervisão humana em tempo real. Isto é comunicado de
forma explícita sempre que um sinal é detetado (`noRealTimeSupervisionNotice`),
nunca escondido atrás de um ecrã genérico.

## Portugal (implementado)

**Recursos de crise imediatos:**
- **Linha 1411 — Linha Nacional de Prevenção do Suicídio e Apoio
  Psicológico** — 1411 — 24 horas, todos os dias, atendida por psicólogos
  com formação em suicidologia.
- **112** — emergência médica, perigo de vida iminente.

**Apoio profissional na área (encaminhamento, não crise):**
- SNS 24 — 808 24 24 24 — triagem e encaminhamento geral de saúde.
- Ordem dos Psicólogos Portugueses — diretório de profissionais licenciados.
- SOS Voz Amiga — apoio emocional por voluntários com formação (16h–24h).

**Contacto da fundadora:** placeholder até a fundadora fornecer o contacto
real de marcação de consulta (ver `backend/src/lib/founder-profile.ts`).

## PALOP e Brasil (por fazer antes de expandir)

Nenhum país fora de Portugal tem recursos configurados. Antes de expandir a
qualquer país do PALOP ou ao Brasil, é preciso pesquisar e validar
localmente (não adivinhar nem reaproveitar contactos portugueses):

- [ ] Angola — linha nacional de prevenção do suicídio (se existir),
      emergência, ordem/associação de psicólogos.
- [ ] Cabo Verde — idem.
- [ ] Moçambique — idem.
- [ ] Guiné-Bissau, São Tomé e Príncipe — idem.
- [ ] Brasil — CVV (Centro de Valorização da Vida) é a referência mais
      conhecida, mas confirmar disponibilidade/número atual e validar com
      critério clínico antes de usar, tal como se fez para Portugal.

`getCrisisResponseBundleForLocale` (em `crisis-resources.ts`) recusa
explicitamente qualquer locale sem recursos configurados — isto é
deliberado, para nunca mostrar uma lista genérica internacional por
omissão.
