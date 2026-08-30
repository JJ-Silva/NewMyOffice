-- ============================================================================
-- 10 · Etapa 5 — import de publicações do DJEN (§2 roadmap item 5)
-- ============================================================================
-- DJEN = Diário de Justiça Eletrônico Nacional (CNJ). A API pública
-- `comunicaapi.pje.jus.br` devolve as intimações/publicações por OAB.
--
--   oab_monitorada  → as OABs dos advogados do escritório (o que buscar)
--   publicacao      → cada comunicação trazida do DJEN, com a triagem:
--                     'nova' → o advogado ainda vai decidir
--                     'descartada' → não gera prazo (informativa)
--                     'virou_prazo' → foi convertida em atividade (atividade_id)
--
-- Casar publicação → processo é pelo nº CNJ (por isso depende da Etapa 2).
-- ============================================================================

create table oab_monitorada (
  id            uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references escritorio (id) on delete cascade,
  numero        text not null,   -- só dígitos, ex.: '515392'
  uf            text not null,   -- ex.: 'SP'
  nome_advogado text,            -- rótulo para a tela
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  deletado_em   timestamptz
);
create unique index oab_monitorada_unica
  on oab_monitorada (escritorio_id, numero, uf) where deletado_em is null;

alter table oab_monitorada enable row level security;
create policy oab_monitorada_do_escritorio on oab_monitorada for all
  using (escritorio_id in (select escritorios_do_usuario()))
  with check (escritorio_id in (select escritorios_do_usuario()));

-- ── Publicações trazidas do DJEN ──────────────────────────────────────────
create table publicacao (
  id                    uuid primary key default gen_random_uuid(),
  escritorio_id         uuid not null references escritorio (id) on delete cascade,

  -- identidade no DJEN (dedupe da busca)
  djen_id               bigint not null,
  hash                  text,               -- para a certidão (PDF) da comunicação
  data_disponibilizacao date not null,      -- é o "dia 1" da contagem (Opção A)

  -- metadados da comunicação
  sigla_tribunal        text,
  nome_orgao            text,
  tipo_comunicacao      text,               -- 'Intimação' | 'Despacho' | ...
  nome_classe           text,
  numero_processo       text,               -- só dígitos, como veio
  cnj                   text,               -- formatado NNNNNNN-DD.AAAA.J.TR.OOOO
  texto                 text not null,      -- texto limpo (sem HTML)
  texto_original        text,               -- bruto (pode ser HTML) — auditoria
  link                  text,
  meio                  text,

  -- triagem
  status                text not null default 'nova'
                          check (status in ('nova', 'descartada', 'virou_prazo')),
  processo_id           uuid references processo (id),   -- vínculo (auto por CNJ ou manual)
  atividade_id          uuid references atividade (id),  -- preenchido quando status='virou_prazo'
  motivo_descarte       text,
  triado_por            uuid references membro (id),
  triado_em             timestamptz,

  criado_em             timestamptz not null default now(),
  deletado_em           timestamptz
);
create unique index publicacao_djen_unica on publicacao (escritorio_id, djen_id);
create index publicacao_triagem
  on publicacao (escritorio_id, status, data_disponibilizacao desc)
  where deletado_em is null;
create index publicacao_por_cnj
  on publicacao (escritorio_id, cnj) where deletado_em is null;

alter table publicacao enable row level security;
create policy publicacao_do_escritorio on publicacao for all
  using (escritorio_id in (select escritorios_do_usuario()))
  with check (escritorio_id in (select escritorios_do_usuario()));
