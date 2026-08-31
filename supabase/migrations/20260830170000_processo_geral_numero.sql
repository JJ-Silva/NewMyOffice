-- ============================================================================
-- 11 · O processo 'geral' passa a carregar o código da pasta como `numero`
-- ============================================================================
-- Conceito (confirmado 2026-08-30): toda atividade pertence a um `processo`, e
-- todo processo tem um número identificador:
--   geral         → código da pasta (AAAA/NNNNNN)
--   judicial      → CNJ
--   administrativo→ número no órgão
--
-- Antes: `processo.numero` era nulo no 'geral'. Agora o trigger que cria o
-- geral já grava o código da pasta ali, e as linhas antigas são preenchidas.
-- ============================================================================

create or replace function criar_processo_geral()
returns trigger
language plpgsql
as $$
begin
  -- `new.codigo` já foi preenchido pelo trigger BEFORE INSERT `pasta_preenche_codigo`.
  insert into processo (escritorio_id, pasta_id, tipo, status, numero)
  values (new.escritorio_id, new.id, 'geral', 'ativo', new.codigo);
  return new;
end;
$$;

-- Backfill dos gerais já existentes.
update processo p
set numero = pa.codigo
from pasta pa
where p.pasta_id = pa.id
  and p.tipo = 'geral'
  and p.numero is null;
