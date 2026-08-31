-- ============================================================================
-- 12 · `atividade.titulo` (e o da recorrência) passa a ser opcional
-- ============================================================================
-- Antes: `titulo` era NOT NULL e o app gravava o nome do tipo quando o usuário
-- deixava "Título (opcional)" em branco — então renomear o tipo não refletia
-- nas atividades já lançadas.
--
-- Agora: título em branco → NULL. A UI mostra `titulo` se houver; senão o nome
-- (ao vivo) do `tipo_atividade`. Assim um título digitado à mão manda, e o
-- rename do tipo se propaga para quem não digitou nada.
-- ============================================================================

alter table atividade            alter column titulo drop not null;
alter table atividade_recorrencia alter column titulo drop not null;

-- Backfill: onde o título é igual ao nome do tipo, presume-se que era o padrão
-- (usuário não digitou nada) → NULL. Onde difere, era digitado → mantém.
update atividade a
set titulo = null
from tipo_atividade t
where a.tipo_atividade_id = t.id
  and a.titulo = t.nome;

update atividade_recorrencia r
set titulo = null
from tipo_atividade t
where r.tipo_atividade_id = t.id
  and r.titulo = t.nome;
