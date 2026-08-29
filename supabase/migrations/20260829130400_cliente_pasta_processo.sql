-- ============================================================================
-- 05 · Cliente, Pasta, Processo (§3.3–§3.5)
-- ============================================================================
-- A Pasta é a unidade central (um caso). Toda pasta nasce com um `processo`
-- do tipo 'geral' (criado por trigger) que representa o trabalho interno do
-- escritório — assim toda atividade sempre tem um processo_id.
-- processo_judicial / processo_administrativo / parte = Etapa 2.
-- ============================================================================

create table cliente (
  id            uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references escritorio (id) on delete cascade,
  nome          text not null,
  cpf_cnpj      text not null,             -- obrigatório; NÃO é a chave
  tipo_pessoa   text not null check (tipo_pessoa in ('fisica', 'juridica')),
  telefone      text,                      -- protótipo já pede no cadastro rápido
  email         text,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz,
  deletado_em   timestamptz
);
create unique index cliente_cpf_cnpj_por_escritorio
  on cliente (escritorio_id, cpf_cnpj) where deletado_em is null;
create trigger cliente_atualizado before update on cliente
  for each row execute function set_atualizado_em();

alter table cliente enable row level security;
create policy cliente_do_escritorio on cliente for all
  using (escritorio_id in (select escritorios_do_usuario()))
  with check (escritorio_id in (select escritorios_do_usuario()));

-- ── Pasta ───────────────────────────────────────────────────────────────────
create table pasta (
  id                 uuid primary key default gen_random_uuid(),
  escritorio_id      uuid not null references escritorio (id) on delete cascade,
  ano                int  not null,
  sequencial         int  not null,
  codigo             text not null,        -- 'AAAA/NNNNNN' — derivado de ano+sequencial, imutável
  nome               text,                 -- livre, opcional, não único
  referencia_externa text,
  area_id            uuid references area (id),
  objetivo           text,                 -- o que se busca
  objeto             text,                 -- sobre o que é
  status             text not null default 'ativa'
                       check (status in ('ativa', 'arquivada', 'suspensa')),
  criado_em          timestamptz not null default now(),
  atualizado_em      timestamptz,
  deletado_em        timestamptz
);
create unique index pasta_ano_sequencial
  on pasta (escritorio_id, ano, sequencial) where deletado_em is null;
create unique index pasta_codigo
  on pasta (escritorio_id, codigo) where deletado_em is null;
create trigger pasta_atualizado before update on pasta
  for each row execute function set_atualizado_em();

-- Gera ano/sequencial/codigo na inserção. O contador reinicia por ano.
-- (Colisão simultânea é rara e barrada pelo índice único — a app tenta de novo.)
create or replace function preencher_codigo_pasta()
returns trigger
language plpgsql
as $$
begin
  if new.ano is null then
    new.ano := extract(year from now())::int;
  end if;
  if new.sequencial is null then
    select coalesce(max(sequencial), 0) + 1
      into new.sequencial
      from pasta
     where escritorio_id = new.escritorio_id
       and ano = new.ano;
  end if;
  new.codigo := new.ano::text || '/' || lpad(new.sequencial::text, 6, '0');
  return new;
end;
$$;
create trigger pasta_preenche_codigo before insert on pasta
  for each row execute function preencher_codigo_pasta();

alter table pasta enable row level security;
create policy pasta_do_escritorio on pasta for all
  using (escritorio_id in (select escritorios_do_usuario()))
  with check (escritorio_id in (select escritorios_do_usuario()));

-- Pasta ↔ Cliente (N:N) — litisconsórcio ativo.
create table pasta_cliente (
  pasta_id   uuid not null references pasta (id) on delete cascade,
  cliente_id uuid not null references cliente (id) on delete cascade,
  primary key (pasta_id, cliente_id)
);
create index pasta_cliente_por_cliente on pasta_cliente (cliente_id, pasta_id);

alter table pasta_cliente enable row level security;
create policy pasta_cliente_do_escritorio on pasta_cliente for all
  using (pasta_id in (select id from pasta where escritorio_id in (select escritorios_do_usuario())))
  with check (pasta_id in (select id from pasta where escritorio_id in (select escritorios_do_usuario())));

-- ── Processo (tabela-base; detalhes por tipo = Etapa 2) ─────────────────────
create table processo (
  id            uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references escritorio (id) on delete cascade,
  pasta_id      uuid not null references pasta (id) on delete cascade,
  tipo          text not null check (tipo in ('geral', 'judicial', 'administrativo')),
  numero        text,                      -- nulo no 'geral'
  status        text not null default 'ativo'
                  check (status in ('ativo', 'suspenso', 'arquivado', 'encerrado')),
  polo_cliente  text check (polo_cliente in ('autor', 'reu', 'terceiro')),  -- nulo no 'geral'
  data_inicio   date,
  data_fim      date,
  observacoes   text,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz,
  deletado_em   timestamptz
);
create index processo_por_pasta on processo (pasta_id) where deletado_em is null;
-- No máximo 1 processo 'geral' por pasta.
create unique index processo_geral_unico
  on processo (pasta_id) where tipo = 'geral' and deletado_em is null;
create trigger processo_atualizado before update on processo
  for each row execute function set_atualizado_em();

-- Toda pasta nasce com o processo 'geral'.
create or replace function criar_processo_geral()
returns trigger
language plpgsql
as $$
begin
  insert into processo (escritorio_id, pasta_id, tipo, status)
  values (new.escritorio_id, new.id, 'geral', 'ativo');
  return new;
end;
$$;
create trigger pasta_cria_processo_geral after insert on pasta
  for each row execute function criar_processo_geral();

alter table processo enable row level security;
create policy processo_do_escritorio on processo for all
  using (escritorio_id in (select escritorios_do_usuario()))
  with check (escritorio_id in (select escritorios_do_usuario()));
