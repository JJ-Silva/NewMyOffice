-- ============================================================================
-- 02 · Multi-tenant e identidade (§3.1)
-- ============================================================================
-- Escritório de advocacia = o "tenant". Todo dado pertence a um escritório.
-- Um usuário pode pertencer a vários escritórios (tabela `membro`).
-- Isolamento: RLS em toda tabela, comparando escritorio_id com escritorios_do_usuario().
-- ============================================================================

create table escritorio (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  cnpj          text,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz,
  deletado_em   timestamptz
);
create trigger escritorio_atualizado before update on escritorio
  for each row execute function set_atualizado_em();

-- Perfil do usuário. O id espelha auth.users.id (Supabase Auth).
create table usuario (
  id            uuid primary key references auth.users (id) on delete cascade,
  nome          text not null,
  email         text not null,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz,
  deletado_em   timestamptz
);
create trigger usuario_atualizado before update on usuario
  for each row execute function set_atualizado_em();

-- Cria o perfil automaticamente quando alguém se cadastra no Supabase Auth.
-- security definer: roda como dono da função, contornando a RLS de `usuario`.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usuario (id, nome, email)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'nome', ''), new.email),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Vínculo usuário ↔ escritório (1:N). O papel é refinado na Etapa 6;
-- na Etapa 1 vale só a regra "dono acessa Configurações".
create table membro (
  id            uuid primary key default gen_random_uuid(),
  usuario_id    uuid not null references usuario (id) on delete cascade,
  escritorio_id uuid not null references escritorio (id) on delete cascade,
  papel         text not null default 'advogado'
                  check (papel in ('dono', 'advogado', 'secretaria')),
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  deletado_em   timestamptz
);
create unique index membro_usuario_escritorio
  on membro (usuario_id, escritorio_id) where deletado_em is null;
create index membro_por_usuario
  on membro (usuario_id) where ativo and deletado_em is null;
create index membro_por_escritorio
  on membro (escritorio_id) where deletado_em is null;

-- Config global do escritório (1:1). Onde vive a margem do prazo interno.
create table configuracao_escritorio (
  escritorio_id             uuid primary key references escritorio (id) on delete cascade,
  margem_prazo_interno_dias int not null default 5,   -- dias úteis (prazo processual)
  agenda_janela_dias        int not null default 30,  -- janela padrão da agenda
  atualizado_em             timestamptz
);
create trigger configuracao_escritorio_atualizado before update on configuracao_escritorio
  for each row execute function set_atualizado_em();

-- ── Helper de RLS ───────────────────────────────────────────────────────────
-- Devolve os escritórios do usuário logado. security definer para ler `membro`
-- sem depender da própria política (evita recursão).
create or replace function escritorios_do_usuario()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select escritorio_id
  from membro
  where usuario_id = auth.uid()
    and ativo
    and deletado_em is null;
$$;

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- INSERT de escritorio/membro/configuracao é feito só pela função de onboarding
-- (migration 07), que roda como security definer. Usuário comum não cria direto.

alter table escritorio enable row level security;
create policy escritorio_do_usuario on escritorio for all
  using (id in (select escritorios_do_usuario()))
  with check (id in (select escritorios_do_usuario()));

alter table usuario enable row level security;
create policy usuario_proprio on usuario for all
  using (id = auth.uid())
  with check (id = auth.uid());

alter table membro enable row level security;
create policy membro_visivel on membro for select
  using (usuario_id = auth.uid() or escritorio_id in (select escritorios_do_usuario()));
create policy membro_gerencia on membro for all
  using (escritorio_id in (select escritorios_do_usuario()))
  with check (escritorio_id in (select escritorios_do_usuario()));

alter table configuracao_escritorio enable row level security;
create policy configuracao_do_escritorio on configuracao_escritorio for all
  using (escritorio_id in (select escritorios_do_usuario()))
  with check (escritorio_id in (select escritorios_do_usuario()));
