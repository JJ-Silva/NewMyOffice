-- ============================================================================
-- 15 · Etapa 6 (Passo D) — convites de membro
-- ============================================================================
-- O administrador (permissão `membros.gerenciar`) convida uma pessoa por
-- e-mail, escolhendo o rótulo. Gera um `convite` com token. A pessoa abre
-- /convite/<token>, entra na conta e aceita — aí um `membro` é criado.
--
-- Aceitar passa por RPC `security definer` porque quem aceita ainda NÃO é
-- membro (a RLS de `convite` e de `membro` não deixaria).
-- ============================================================================

create table convite (
  id            uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references escritorio (id) on delete cascade,
  email         text not null,
  rotulo_id     uuid references rotulo (id) on delete set null,
  token         text not null unique,
  status        text not null default 'pendente'
                  check (status in ('pendente', 'aceito', 'cancelado')),
  criado_por    uuid references membro (id),
  criado_em     timestamptz not null default now(),
  expira_em     timestamptz not null default now() + interval '14 days',
  aceito_em     timestamptz,
  aceito_por    uuid references usuario (id)
);
create index convite_por_escritorio
  on convite (escritorio_id) where status = 'pendente';
-- um convite pendente por e-mail por escritório
create unique index convite_email_pendente
  on convite (escritorio_id, lower(email)) where status = 'pendente';

alter table convite enable row level security;
create policy convite_gerencia on convite for all
  using (tem_permissao(escritorio_id, 'membros.gerenciar'))
  with check (tem_permissao(escritorio_id, 'membros.gerenciar'));

-- ── Ver os dados de um convite (tela pública /convite/<token>) ──────────────
create or replace function ver_convite(p_token text)
returns table (
  escritorio_nome text,
  rotulo_nome     text,
  email           text,
  status          text,
  expirado        boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select e.nome,
         r.nome,
         c.email,
         c.status,
         (c.expira_em <= now())
  from convite c
  join escritorio e on e.id = c.escritorio_id
  left join rotulo r on r.id = c.rotulo_id
  where c.token = p_token;
$$;
grant execute on function ver_convite(text) to anon, authenticated;

-- ── Aceitar o convite → cria o membro ──────────────────────────────────────
create or replace function aceitar_convite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_email text;
  c       convite%rowtype;
begin
  if v_uid is null then
    raise exception 'Entre na sua conta antes de aceitar o convite.';
  end if;

  select * into c from convite where token = p_token;
  if not found then
    raise exception 'Convite não encontrado.';
  end if;
  if c.status <> 'pendente' then
    raise exception 'Este convite já foi usado ou cancelado.';
  end if;
  if c.expira_em <= now() then
    raise exception 'Este convite expirou. Peça um novo ao escritório.';
  end if;

  select email into v_email from auth.users where id = v_uid;
  if lower(v_email) <> lower(c.email) then
    raise exception 'Este convite é para % — você está na conta %.', c.email, v_email;
  end if;

  if not exists (
    select 1 from membro
    where usuario_id = v_uid
      and escritorio_id = c.escritorio_id
      and deletado_em is null
  ) then
    insert into membro (usuario_id, escritorio_id, rotulo_id)
      values (v_uid, c.escritorio_id, c.rotulo_id);
  end if;

  update convite
     set status = 'aceito', aceito_em = now(), aceito_por = v_uid
   where id = c.id;

  return c.escritorio_id;
end;
$$;
grant execute on function aceitar_convite(text) to authenticated;
