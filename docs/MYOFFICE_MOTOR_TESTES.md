# MYOFFICE — Casos de teste do motor de cálculo de prazo

**Objetivo:** validar a lógica do motor (`§4.B` do `MYOFFICE_MVP_PLANO.md`) **antes de virar código**.
Cada caso: entrada → resultado que o motor deve produzir. **As datas abaixo são a minha computação manual — você (advogado) confere cada uma.** Depois de validados, estes viram os testes automatizados (`lib/domain/prazo.test.ts`) e a spec fica travada.

**Escopo:** v1 calcula `processual` **e** `interna` — ambos em **dias úteis**. `interna` tem `tribunal_id` opcional (nulo → pula só sáb/dom). `material` (prescrição/decadência) → não calculado, a UI pede a data direto.

Regra do motor (resumo): a **data de entrada = disponibilização** é o **dia 1** (não se exclui o dia do começo — Opção A). Conta-se `N` **dias úteis** (pulando sáb/dom + feriados **do tribunal do prazo** + recesso). Em modo úteis o resultado é sempre útil (sem prorrogação). Prazo interno = `prazo_fatal − margem` (5 dias úteis para trás; **não prorroga**, Q3).

---

## Calendário de teste (2026)

Cada caso assume um `tribunal` fictício **"TJ-TESTE"** com estes feriados/recesso cadastrados:

| Data | Dia | Feriado |
|---|---|---|
| 01/01/2026 | qui | Confraternização |
| 16/02/2026 | seg | Carnaval |
| 17/02/2026 | ter | Carnaval |
| 03/04/2026 | sex | Paixão de Cristo |
| 21/04/2026 | ter | Tiradentes |
| 01/05/2026 | sex | Dia do Trabalho |
| 04/06/2026 | qui | Corpus Christi |
| 07/09/2026 | seg | Independência |
| 12/10/2026 | seg | N. Sra. Aparecida |
| 02/11/2026 | seg | Finados |
| 20/11/2026 | sex | Consciência Negra |
| 25/12/2026 | sex | Natal |
| **20/12/2026 → 20/01/2027** | — | **Recesso forense** (`periodo_nao_util`) |

*(Na prática cada tribunal tem seu calendário; aqui usamos um só para os testes.)*

---

## Casos

### T1 — Prazo processual simples, sem feriado no intervalo
**Entrada:** Contestação · 15 dias úteis · disponibilização **quarta 04/03/2026** · sem dobro
**Contagem:** 04/03(1) 05(2) 06(3) — 09(4) 10(5) 11(6) 12(7) 13(8) — 16(9) 17(10) 18(11) 19(12) 20(13) — 23(14) **24(15)**
**Esperado:** `prazo_fatal = 24/03/2026 (terça)` · `prazo_interno = 17/03/2026 (terça)` *(10º dia útil)*

### T2 — Prazo processual com feriado no meio
**Entrada:** Contestação · 15 úteis · disponibilização **sexta 27/03/2026**
**Contagem:** 27/03(1) — 30(2) 31(3) 01/04(4) 02(5) — [03/04 Paixão pula] — 06(6) 07(7) 08(8) 09(9) 10(10) — 13(11) 14(12) 15(13) 16(14) **17(15)**
**Esperado:** `prazo_fatal = 17/04/2026 (sexta)` · `prazo_interno = 10/04/2026 (sexta)` *(10º útil, contando o pulo de 03/04)*

### T3 — Prazo em dobro
**Entrada:** Contestação · 15 úteis · **em dobro (N = 30)** · disponibilização **segunda 02/03/2026**
**Contagem:** 02–06/03 (1–5) · 09–13 (6–10) · 16–20 (11–15) · 23–27 (16–20) · 30/03–02/04 (21–24) · [03/04 pula] · 06–10/04 (25–29) · **13/04 (30)**
**Esperado:** `prazo_fatal = 13/04/2026 (segunda)` · `prazo_interno = 06/04/2026 (segunda)` *(25º útil)*

### T4 — Prazo curto onde a margem estoura → "prazo apertado"
**Entrada:** Embargos de declaração · 5 úteis · disponibilização **quinta 16/04/2026** · Tiradentes 21/04 no meio
**Contagem:** 16/04(1) 17(2) — 20(3) — [21/04 Tiradentes pula] — 22(4) **23(5)**
**Esperado:** `prazo_fatal = 23/04/2026 (quinta)`
`prazo_interno`: N − margem = 5 − 5 = 0 → `prazo_interno = max(16/04, hoje)` + **`prazo_apertado = true`** (a margem foi comprimida — badge na tela)

### T5 — Disponibilização em dia não útil (sábado)
**Entrada:** Contestação · 15 úteis · disponibilização **sábado 07/03/2026**
**Regra:** dia 1 = primeiro dia contável ≥ 07/03 = **09/03 (segunda)**
**Contagem:** 09–13 (1–5) · 16–20 (6–10) · 23–27 (11–15)
**Esperado:** `prazo_fatal = 27/03/2026 (sexta)` · `prazo_interno = 20/03/2026 (sexta)`

### T6 — Disponibilização num feriado
**Entrada:** Contestação · 15 úteis · disponibilização **sexta 03/04/2026 (Paixão)**
**Regra:** dia 1 = primeiro contável ≥ 03/04, pulando 03/04 (feriado) e 04–05 (fds) = **06/04 (segunda)**
**Contagem:** 06–10/04 (1–5) · 13–17 (6–10) · 20 (11) · [21/04 Tiradentes pula] · 22 (12) 23 (13) 24 (14) · **27/04 (15)**
**Esperado:** `prazo_fatal = 27/04/2026 (segunda)` · `prazo_interno = 17/04/2026 (sexta)`

### ~~T7 / T8 — Prazo material (dias corridos)~~ — **FORA DO V1**
Decisão 29/08: o motor não calcula prazo **material** (prescrição/decadência) no v1 — a UI pede a data direto. Estes casos voltam quando material for implementado.

### T7-novo — Prazo `interna` (dias úteis, sem tribunal)
**Entrada:** tipo `interna` "Elaborar contrato" · advogado informa **10 dias** · data inicial **segunda 02/03/2026** · sem `tribunal_id` (pula só sáb/dom)
**Contagem:** 02–06/03 (1–5) · 09–13/03 (6–10) → dia 10 = **13/03/2026 (sexta)**
**Esperado:** `prazo_fatal = 13/03/2026 (sexta)` · `prazo_interno = 06/03/2026 (sexta)` *(fatal − 5 úteis; Q2 = sim)*

### T9 — Prazo cruzando o recesso forense
**Entrada:** Contestação · 15 úteis · disponibilização **segunda 14/12/2026**
**Contagem:** 14–18/12 (1–5) · [19/12 fds · 20/12→20/01 recesso — tudo pula] · 21/01/2027 (6) 22 (7) · 25 (8) 26 (9) 27 (10) 28 (11) 29 (12) · 01/02 (13) 02 (14) **03/02 (15)**
**Esperado:** `prazo_fatal = 03/02/2027 (quarta)` · `prazo_interno = 27/01/2027 (quarta)` *(10º útil)*

### T10 — Prazo `material` (não calculado no v1)
**Entrada:** tipo `material` (ex.: prazo prescricional) · advogado informa a **data do prazo** direto: 15/04/2026
**Esperado:** `prazo_fatal = 15/04/2026` (`prazo_fatal_ajustado_manual = true`, sem memória de cálculo). `prazo_interno = 08/04/2026` *(fatal − 5 úteis)*.

### T11 — Correção manual do prazo fatal
**Cenário:** T1 calculou `fatal = 24/03`. O juízo aplicou prazo simples (litisconsortes com mesmo procurador). Advogado corrige.
**Ação:** `prazo_fatal = 20/03/2026` · `prazo_fatal_ajustado_manual = true` · `motivo_ajuste = "litisconsortes com o mesmo procurador — art. 229 não incide"` (obrigatório)
**Esperado:** grava linha em `prazo_historico`; `prazo_interno` re-derivado = `20/03 − 5 úteis = 13/03/2026`; tela mostra "sistema calculou 24/03 · adotado 20/03 — motivo: …"

### T12 — Aviso de calendário incompleto
**Cenário:** prazo (tribunal TJ-TESTE) cujo intervalo `[data_inicial, prazo_fatal]` cai em **novembro/2026** e o tribunal **não tem nenhum feriado de novembro cadastrado**.
**Esperado:** o motor calcula normalmente, mas a UI exibe **aviso**: "sem feriados cadastrados para nov/2026 (TJ-TESTE) — confira o cálculo". Não bloqueia o lançamento.

### T13 — Prazo processual em dobro (30 úteis)
**Entrada:** Contestação · **em dobro (N = 30)** · disponibilização **segunda 02/03/2026** · Paixão 03/04 no meio
**Contagem:** 02–06/03 (1–5) · 09–13 (6–10) · 16–20 (11–15) · 23–27 (16–20) · 30/03–02/04 (21–24) · [03/04 pula] · 06–10/04 (25–29) · **13/04 (30)**
**Esperado:** `prazo_fatal = 13/04/2026 (segunda)` · `prazo_interno = 06/04/2026 (segunda)` *(25º útil)*
*(idêntico ao T3 — mantido como caso explícito de "dobro processual")*

---

## Status das perguntas (rodada 29/08)

| # | Pergunta | Status |
|---|---|---|
| Q1 | Prazo material não prorroga? | **Adiada** — material fora do v1 |
| Q2 | `prazo_interno` para `interna` — fatal − 5 dias? | ✅ **Sim** |
| Q3 | Prazo interno prorroga se cair em dia não útil? | ✅ **Não** (contando úteis para trás, sempre cai em dia útil) |
| Q4 | Carnaval/Corpus/Cinzas no seed? | ✅ **Não** — cada tribunal adiciona (feriados são por tribunal) |
| Q5 | Lista/dias/naturezas do seed | ✅ Revisada (§4.A.4) — **conferir os dias como advogado** |
| P10 | `interna` conta **corridos ou úteis**? | ✅ **Úteis** |

---

## Próximo passo — só falta o P1

Você confere **T1–T13** (marca ✅/❌ + a data certa onde eu errei — **atenção especial ao T9**, recesso). Com isso o motor está 100% especificado → codar `lib/domain/prazo.ts` + os testes.
