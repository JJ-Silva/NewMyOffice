-- ============================================================================
-- 08 · Etapa 2 — detalhe de processo (judicial / administrativo) + partes (§3.5)
-- ============================================================================
-- A tabela-base `processo` já existe (migration 05) e já aceita
-- tipo in ('geral','judicial','administrativo'). Aqui entram os detalhes 1:1
-- e a tabela `parte`.
--
-- Divergência do plano registrada em docs/prototipo/TELAS.md: o campo de
-- andamento do processo chama-se `fase` (não `situacao`).
-- ============================================================================

-- ── Processo judicial (detalhe 1:1) ────────────────────────────────────────
create table processo_judicial (
  processo_id      uuid primary key references processo (id) on delete cascade,
  escritorio_id    uuid not null references escritorio (id) on delete cascade,

  -- número CNJ (Res. CNJ 65/2008): NNNNNNN-DD.AAAA.J.TR.OOOO
  cnj              text,                 -- número completo, formatado
  cnj_sequencial   bigint,               -- NNNNNNN
  cnj_dv           int,                  -- DD (dígito verificador)
  cnj_ano          int,                  -- AAAA
  cnj_segmento     int,                  -- J  (1 dígito)
  cnj_tribunal     int,                  -- TR (2 dígitos)
  cnj_origem       int,                  -- OOOO (4 dígitos)
  cnj_digito_confere boolean,            -- o DV bate? (informativo — não bloqueia)

  justica          text check (justica in
                     ('estadual','federal','trabalho','eleitoral','militar','superior')),
  tribunal_id      uuid references tribunal (id),  -- opcional: casa com o catálogo de Configurações
  vara             text,
  comarca          text,
  instancia        text,
  tipo_acao        text,
  juizo            text,
  fase             text,                 -- andamento atual (texto livre)
  valor_causa      numeric,
  data_distribuicao date,

  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz,
  deletado_em      timestamptz
);
create index processo_judicial_por_escritorio
  on processo_judicial (escritorio_id) where deletado_em is null;
create index processo_judicial_por_cnj
  on processo_judicial (escritorio_id, cnj) where deletado_em is null;
create trigger processo_judicial_atualizado before update on processo_judicial
  for each row execute function set_atualizado_em();

alter table processo_judicial enable row level security;
create policy processo_judicial_do_escritorio on processo_judicial for all
  using (escritorio_id in (select escritorios_do_usuario()))
  with check (escritorio_id in (select escritorios_do_usuario()));

-- ── Processo administrativo (detalhe 1:1) ─────────────────────────────────
create table processo_administrativo (
  processo_id           uuid primary key references processo (id) on delete cascade,
  escritorio_id         uuid not null references escritorio (id) on delete cascade,
  numero_adm            text,
  orgao_julgador        text,
  secretaria            text,
  esfera                text check (esfera in ('federal','estadual','municipal')),
  tipo                  text,
  assunto               text,
  autoridade_competente text,
  protocolo             text,
  data_protocolo        date,
  fase                  text,
  criado_em             timestamptz not null default now(),
  atualizado_em         timestamptz,
  deletado_em           timestamptz
);
create index processo_administrativo_por_escritorio
  on processo_administrativo (escritorio_id) where deletado_em is null;
create trigger processo_administrativo_atualizado before update on processo_administrativo
  for each row execute function set_atualizado_em();

alter table processo_administrativo enable row level security;
create policy processo_administrativo_do_escritorio on processo_administrativo for all
  using (escritorio_id in (select escritorios_do_usuario()))
  with check (escritorio_id in (select escritorios_do_usuario()));

-- ── Partes (vinculadas ao processo) ──────────────────────────────────────
create table parte (
  id               uuid primary key default gen_random_uuid(),
  escritorio_id    uuid not null references escritorio (id) on delete cascade,
  processo_id      uuid not null references processo (id) on delete cascade,
  nome             text not null,
  tipo_parte       text not null check (tipo_parte in
                     ('autor','reu','litisconsorte','terceiro','assistente','interessado')),
  cpf_cnpj         text,
  advogado_adverso text,
  oab_adverso      text,
  criado_em        timestamptz not null default now(),
  deletado_em      timestamptz
);
create index parte_por_processo on parte (processo_id) where deletado_em is null;

alter table parte enable row level security;
create policy parte_do_escritorio on parte for all
  using (escritorio_id in (select escritorios_do_usuario()))
  with check (escritorio_id in (select escritorios_do_usuario()));
