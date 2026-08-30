# INÍCIO — MyOffice

O projeto já está scaffoldado (Next.js 16 + TS + Tailwind + Vitest + Supabase CLI). Este arquivo é o roteiro da **primeira entrega**.

## Antes de tudo
Leia inteiros: `docs/MYOFFICE_MVP_PLANO.md`, depois `docs/MYOFFICE_MOTOR_TESTES.md`, depois `docs/referencia/funcao-vba-Contar_Prazos.txt`, e **`docs/prototipo/TELAS.md`** (o desenho das telas — paleta, layout, textos). As regras estão em `CLAUDE.md` e no §0/§1.1 do plano.

## Escopo desta entrega — SÓ a fatia vertical (plano §4)

Fluxo: cadastro/login → cria escritório (seed de `area` e `tipo_atividade`) → **Configurações: cadastrar 1 tribunal + alguns feriados** → cadastrar cliente → abrir pasta (cria o `processo` `geral` automaticamente) → lançar 1 prazo (tipo processual + tribunal + data da disponibilização) → o motor calcula fatal + interno → o prazo aparece na agenda ordenada por vencimento com os estados visuais → concluir o prazo. **Deploy na Vercel + Supabase.**

**NÃO construir agora:** compromisso e monitoramento (vêm depois, mesma Etapa 1); processo judicial/administrativo e parsing CNJ (Etapa 2); notificações; recorrência; relatórios; visão calendário.

## Passos (parar e mostrar ao fim de cada um)

1. **Verificar o scaffold** — `npm test` (o teste de fumaça passa), `npm run build` compila. Ajustar o que estiver quebrado. Apagar `lib/domain/exemplo.test.ts` quando o primeiro teste real existir.

2. **Migrations** — **já criadas** em `supabase/migrations/` (todo o §3 exceto `processo_judicial`/`administrativo`/`parte` = Etapa 2). Ver `supabase/migrations/README.md`.
   - **Revisar** o SQL (não regerar). Rodar `npm run db:start` (precisa de Docker) e `npm run db:reset` — deve aplicar limpo.
   - Se algo não aplicar, corrigir na própria migration (ainda não foi para produção) e commitar.
   - A função `onboarding_criar_escritorio(nome)` (migration 07) já copia os catálogos padrão por escritório.

3. **Auth + onboarding** — Supabase Auth (e-mail/senha). `lib/supabase/{server,browser,sessao}.ts`. Fluxo criar escritório → `membro` (dono) → copiar seeds. Sessão guarda o `escritorio_id` ativo. `podeFazer(membro, acao)` — hoje: só `dono` acessa Configurações, resto liberado a membro ativo.

4. **Configurações** — CRUD de `tribunal`, `feriado` (com vínculo a tribunais), `periodo_nao_util`.

5. **`lib/domain/prazo.ts`** — porte da `Contar_Prazos` conforme o §4.B do plano + `docs/MYOFFICE_MOTOR_TESTES.md`. Implementar **agora** com os casos T1–T13 como testes (`lib/domain/prazo.test.ts`); o Jefferson valida contra casos reais depois. `lib/domain/atividade.ts` — `REGRAS_TIPO`, `atividadeVisivelEm`, `prioridadeEfetiva`.

6. **CRUD cliente + pasta** — formulários e listas mínimos. Pasta cria o `processo` geral.

7. **Lançar prazo** — form (pasta → tipo → tribunal → evento + data → dobro?) → `lib/domain/prazo.ts` → grava `atividade` + `atividade_prazo` + `configuracao_contagem`; `atividade.data = prazo_fatal`.

8. **Agenda** — lista ordenada por `data`, estados visuais (§4 Bloco C), filtros, concluir, observações, detalhe com memória de cálculo + `prazo_historico`.

9. **Deploy** — Vercel + Supabase (projeto real). Registrar a região do Supabase no `docs/MYOFFICE_MVP_PLANO.md` (pendência P4).

## Depois da fatia vertical
Semanas 3–4 da Etapa 1: tipos `compromisso` e `monitoramento` (reusam toda a base). Depois, roadmap §2 do plano.

**Estado (2026-08-30): Etapa 1 completa e DEPLOYADA.**
- Passos 1–9 feitos. App no ar: https://new-my-office.vercel.app
- Repo: github.com/JJ-Silva/NewMyOffice (auto-deploy no push da `master`).
- Os 3 tipos de atividade (prazo/compromisso/monitoramento) + motor de prazo (T1–T13
  validados) + agenda + auth + multi-tenant. Bateria de testes ponta a ponta OK.
- Pendência menor: apontar Site URL / Redirect URLs no Supabase Auth para o domínio Vercel
  (não trava o login por senha; importa para e-mail de confirmação/reset).
- **Próximo: Etapa 2** — processos judiciais/administrativos, parsing CNJ, partes.
  As tabelas `processo_judicial` etc. ainda não existem no banco.
