-- ============================================================================
-- 01 · Base — funções e convenções compartilhadas
-- ============================================================================
-- Convenções deste projeto (ver docs/MYOFFICE_MVP_PLANO.md §3):
--   • id            uuid, chave primária, default gen_random_uuid()
--   • escritorio_id uuid — em toda tabela de domínio; isola os dados por tenant via RLS
--   • criado_em / atualizado_em / deletado_em (timestamptz)
--   • soft-delete: nunca DELETE físico de dado jurídico — marca-se deletado_em.
--     Toda consulta filtra "deletado_em is null".
--   • enums = text + CHECK (mais fácil de evoluir que CREATE TYPE)
-- ============================================================================

-- gen_random_uuid() já existe no Postgres 13+ (Supabase). pgcrypto garante em bases antigas.
create extension if not exists pgcrypto;

-- Mantém a coluna atualizado_em em todo UPDATE. Usar em toda tabela que a tiver.
create or replace function set_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

comment on function set_atualizado_em() is
  'Trigger BEFORE UPDATE: preenche atualizado_em = now().';
