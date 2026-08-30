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

**Estado (2026-08-30): Etapas 1, 2, 3a, 3c e 5 feitas e DEPLOYADAS.**
- App no ar: https://new-my-office.vercel.app · repo github.com/JJ-Silva/NewMyOffice
  (auto-deploy no push da `master`).
- **Etapa 1**: 3 tipos de atividade (prazo/compromisso/monitoramento) + motor de prazo
  (T1–T13) + agenda + auth + multi-tenant.
- **Etapa 2**: `processo_judicial` / `processo_administrativo` / `parte` (migration aplicada);
  `lib/domain/cnj.ts` (parsing + dígito verificador Res. CNJ 65/2008); telas `/processos`
  (lista + cadastro com validação do CNJ) e `/pastas/[id]` (detalhe, edição, partes);
  o lançamento de prazo agora liga a atividade a um processo judicial específico.
- **Etapa 3a**: `atividade_recorrencia` (migration aplicada) + `lib/domain/recorrencia.ts`
  (intervalo / semanal / mensal · fim por data / nº de vezes / indefinido); materialização
  em janela rolante de 90 dias ao abrir a agenda + "gera a próxima ao concluir"; bloco
  "Repetir esta atividade" nos formulários de compromisso e monitoramento; tela
  `/recorrencias` (lista, encerrar, excluir).
- **Etapa 3c**: visão calendário em `/agenda/calendario` — grade mês/semana (domingo→sábado),
  navegação ‹ Hoje ›, filtros pasta/tipo + "mostrar concluídas", toggle Lista⇄Calendário no
  cabeçalho da agenda. `lib/domain/grade-calendario.ts` (puro, testado).
- **Etapa 5**: import de publicações do DJEN. `oab_monitorada` + `publicacao` (migration
  aplicada); `lib/djen/comunica-api.ts` (API pública `comunicaapi.pje.jus.br`);
  `lib/domain/publicacao.ts` (limpa HTML, normaliza CNJ, sugere tipo/dias do texto);
  tela `/publicacoes` (buscar por período com presets 1/7/15/30 dias, abas por status,
  auto-match por CNJ, descartar) e `/publicacoes/[id]` (cadastrar processo na hora com CNJ
  travado / vincular a pasta / virar prazo — reusa o form de prazo + motor). OABs
  cadastradas em Configurações.
  **Cron diário** (`vercel.json` + `/api/cron/buscar-djen`, 10h UTC = 7h BRT): busca só o
  dia atual para todos os escritórios com OAB ativa. Exige na Vercel as envs
  `SUPABASE_SERVICE_ROLE_KEY` e `CRON_SECRET` (o cron não tem sessão de usuário).
- **Próximo (roadmap §2 do plano)**: 4 documentos · 6 papéis/convites · 7 relatórios ·
  3b alertas por e-mail (adiado para o final).
