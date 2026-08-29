# INÍCIO — MyOffice

O projeto já está scaffoldado (Next.js 16 + TS + Tailwind + Vitest + Supabase CLI). Este arquivo é o roteiro da **primeira entrega**.

## Antes de tudo
Leia inteiros: `docs/MYOFFICE_MVP_PLANO.md`, depois `docs/MYOFFICE_MOTOR_TESTES.md`, depois `docs/referencia/funcao-vba-Contar_Prazos.txt`. As regras estão em `CLAUDE.md` e no §0/§1.1 do plano.

## Escopo desta entrega — SÓ a fatia vertical (plano §4)

Fluxo: cadastro/login → cria escritório (seed de `area` e `tipo_atividade`) → **Configurações: cadastrar 1 tribunal + alguns feriados** → cadastrar cliente → abrir pasta (cria o `processo` `geral` automaticamente) → lançar 1 prazo (tipo processual + tribunal + data da disponibilização) → o motor calcula fatal + interno → o prazo aparece na agenda ordenada por vencimento com os estados visuais → concluir o prazo. **Deploy na Vercel + Supabase.**

**NÃO construir agora:** compromisso e monitoramento (vêm depois, mesma Etapa 1); processo judicial/administrativo e parsing CNJ (Etapa 2); notificações; recorrência; relatórios; visão calendário.

## Passos (parar e mostrar ao fim de cada um)

1. **Verificar o scaffold** — `npm test` (o teste de fumaça passa), `npm run build` compila. Ajustar o que estiver quebrado. Apagar `lib/domain/exemplo.test.ts` quando o primeiro teste real existir.

2. **Migrations** (`supabase/migrations/`, via `supabase migration new`) — todo o §3 do plano **exceto** `processo_judicial`, `processo_administrativo` e `parte` (Etapa 2). Ou seja:
   - `escritorio`, `usuario`, `membro`, `configuracao_escritorio` + trigger `handle_new_user` + função `escritorios_do_usuario()`
   - catálogos: `area`, `tipo_atividade`
   - calendário: `tribunal`, `feriado`, `feriado_tribunal`, `periodo_nao_util`, `periodo_nao_util_tribunal`
   - `cliente`
   - `pasta`, `pasta_cliente` + trigger que cria o `processo` `geral`
   - `processo` (base)
   - `atividade` + `atividade_prazo` + `atividade_compromisso` + `atividade_monitoramento` + `configuracao_contagem`
   - `observacao`, `prazo_historico`
   - **RLS por tenant em todas** (policy `escritorio_id in (select escritorios_do_usuario())`)
   - índices (agenda, FKs, `feriado_tribunal`)
   - `supabase/seed.sql`: catálogos `area` e `tipo_atividade` (§4.A.4)
   - `npm run db:reset` roda limpo.

3. **Auth + onboarding** — Supabase Auth (e-mail/senha). `lib/supabase/{server,browser,sessao}.ts`. Fluxo criar escritório → `membro` (dono) → copiar seeds. Sessão guarda o `escritorio_id` ativo. `podeFazer(membro, acao)` — hoje: só `dono` acessa Configurações, resto liberado a membro ativo.

4. **Configurações** — CRUD de `tribunal`, `feriado` (com vínculo a tribunais), `periodo_nao_util`.

5. **`lib/domain/prazo.ts`** — porte da `Contar_Prazos` conforme o §4.B do plano + `docs/MYOFFICE_MOTOR_TESTES.md`. Implementar **agora** com os casos T1–T13 como testes (`lib/domain/prazo.test.ts`); o Jefferson valida contra casos reais depois. `lib/domain/atividade.ts` — `REGRAS_TIPO`, `atividadeVisivelEm`, `prioridadeEfetiva`.

6. **CRUD cliente + pasta** — formulários e listas mínimos. Pasta cria o `processo` geral.

7. **Lançar prazo** — form (pasta → tipo → tribunal → evento + data → dobro?) → `lib/domain/prazo.ts` → grava `atividade` + `atividade_prazo` + `configuracao_contagem`; `atividade.data = prazo_fatal`.

8. **Agenda** — lista ordenada por `data`, estados visuais (§4 Bloco C), filtros, concluir, observações, detalhe com memória de cálculo + `prazo_historico`.

9. **Deploy** — Vercel + Supabase (projeto real). Registrar a região do Supabase no `docs/MYOFFICE_MVP_PLANO.md` (pendência P4).

## Depois da fatia vertical
Semanas 3–4 da Etapa 1: tipos `compromisso` e `monitoramento` (reusam toda a base). Depois, roadmap §2 do plano.
