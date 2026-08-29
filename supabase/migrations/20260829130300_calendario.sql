-- ============================================================================
-- 04 · Calendário de feriados, por tribunal (§3.2)
-- ============================================================================
-- Decisão 29/08: feriados são 100% manuais e vinculados a tribunais.
-- NÃO há feriado nacional automático — mesmo 25/12 é cadastrado e vinculado
-- aos tribunais do escritório. O motor de prazo usa o `tribunal` do prazo
-- para saber quais feriados aplicar. Escritório novo começa com zero feriados
-- (o motor avisa quando o intervalo do cálculo não tem feriados cadastrados).
-- ============================================================================

-- Órgãos onde o escritório atua — cada um tem seu calendário.
create table tribunal (
  id            uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references escritorio (id) on delete cascade,
  nome          text not null,
  sigla         text not null,
  esfera        text check (esfera in
                  ('estadual', 'federal', 'trabalhista', 'eleitoral', 'superior', 'administrativo')),
  uf            text,
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  deletado_em   timestamptz
);
create index tribunal_por_escritorio on tribunal (escritorio_id) where deletado_em is null;

alter table tribunal enable row level security;
create policy tribunal_do_escritorio on tribunal for all
  using (escritorio_id in (select escritorios_do_usuario()))
  with check (escritorio_id in (select escritorios_do_usuario()));

-- Um feriado (data + descrição). Se repete_todo_ano, só o mês/dia importam.
create table feriado (
  id              uuid primary key default gen_random_uuid(),
  escritorio_id   uuid not null references escritorio (id) on delete cascade,
  data            date not null,
  descricao       text not null,
  repete_todo_ano boolean not null default false,
  criado_em       timestamptz not null default now(),
  deletado_em     timestamptz
);
create index feriado_por_escritorio_data on feriado (escritorio_id, data) where deletado_em is null;

alter table feriado enable row level security;
create policy feriado_do_escritorio on feriado for all
  using (escritorio_id in (select escritorios_do_usuario()))
  with check (escritorio_id in (select escritorios_do_usuario()));

-- N:N — em quais tribunais NÃO há expediente nesse feriado.
create table feriado_tribunal (
  feriado_id  uuid not null references feriado (id) on delete cascade,
  tribunal_id uuid not null references tribunal (id) on delete cascade,
  primary key (feriado_id, tribunal_id)
);
create index feriado_tribunal_por_tribunal on feriado_tribunal (tribunal_id, feriado_id);

alter table feriado_tribunal enable row level security;
-- herda o isolamento via o feriado (que já é do escritório)
create policy feriado_tribunal_do_escritorio on feriado_tribunal for all
  using (feriado_id in (select id from feriado where escritorio_id in (select escritorios_do_usuario())))
  with check (feriado_id in (select id from feriado where escritorio_id in (select escritorios_do_usuario())));

-- Intervalos sem expediente (recesso forense — CPC art. 220 — e afins).
create table periodo_nao_util (
  id              uuid primary key default gen_random_uuid(),
  escritorio_id   uuid not null references escritorio (id) on delete cascade,
  data_inicio     date not null,
  data_fim        date not null,
  descricao       text not null,
  repete_todo_ano boolean not null default false,
  criado_em       timestamptz not null default now(),
  deletado_em     timestamptz,
  check (data_fim >= data_inicio)
);
create index periodo_nao_util_por_escritorio on periodo_nao_util (escritorio_id) where deletado_em is null;

alter table periodo_nao_util enable row level security;
create policy periodo_nao_util_do_escritorio on periodo_nao_util for all
  using (escritorio_id in (select escritorios_do_usuario()))
  with check (escritorio_id in (select escritorios_do_usuario()));

create table periodo_nao_util_tribunal (
  periodo_id  uuid not null references periodo_nao_util (id) on delete cascade,
  tribunal_id uuid not null references tribunal (id) on delete cascade,
  primary key (periodo_id, tribunal_id)
);
create index periodo_nao_util_tribunal_por_tribunal on periodo_nao_util_tribunal (tribunal_id, periodo_id);

alter table periodo_nao_util_tribunal enable row level security;
create policy periodo_nao_util_tribunal_do_escritorio on periodo_nao_util_tribunal for all
  using (periodo_id in (select id from periodo_nao_util where escritorio_id in (select escritorios_do_usuario())))
  with check (periodo_id in (select id from periodo_nao_util where escritorio_id in (select escritorios_do_usuario())));
