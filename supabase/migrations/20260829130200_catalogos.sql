-- ============================================================================
-- 03 · Catálogos por escritório (§3.2, §3.6, §4.A.4)
-- ============================================================================
-- Cada escritório tem os seus. A função de onboarding (migration 07) copia os
-- valores-padrão para o escritório novo; depois o autor edita em Configurações.
-- ============================================================================

-- Área da pasta (cível, trabalhista, ...).
create table area (
  id            uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references escritorio (id) on delete cascade,
  nome          text not null,
  ordem         int  not null default 0,
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  deletado_em   timestamptz
);
create index area_por_escritorio on area (escritorio_id) where deletado_em is null;

alter table area enable row level security;
create policy area_do_escritorio on area for all
  using (escritorio_id in (select escritorios_do_usuario()))
  with check (escritorio_id in (select escritorios_do_usuario()));

-- Catálogo dos "tratamentos" — o título padrão da atividade vem daqui.
-- Um único catálogo para os 3 tipos, distinguidos por `aplica_a`.
-- dias_padrao / natureza / exige_peca só são usados quando aplica_a = 'prazo'.
create table tipo_atividade (
  id            uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references escritorio (id) on delete cascade,
  nome          text not null,
  aplica_a      text not null check (aplica_a in ('prazo', 'compromisso', 'monitoramento')),
  dias_padrao   int,
  natureza      text check (natureza in ('processual', 'material', 'interna')),
  exige_peca    boolean not null default false,
  categoria     text,   -- resposta | recurso | manifestacao | cumprimento | providencia_interna
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  deletado_em   timestamptz
);
create index tipo_atividade_por_escritorio
  on tipo_atividade (escritorio_id, aplica_a) where deletado_em is null;

alter table tipo_atividade enable row level security;
create policy tipo_atividade_do_escritorio on tipo_atividade for all
  using (escritorio_id in (select escritorios_do_usuario()))
  with check (escritorio_id in (select escritorios_do_usuario()));
