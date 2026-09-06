-- ============================================================================
-- 19 · Tramitação — backfill do fio com o que já existia
-- ============================================================================
-- A feature Tramitação (migration 18) só passou a registrar `andamento` a
-- partir do deploy. Esta migration roda UMA vez e recupera o histórico dos
-- casos que já estavam no ar: publicações, prazos/compromissos/monitoramentos
-- (lançados e concluídos), anotações e ajustes de prazo.
--
-- ADITIVA: só faz INSERT em `andamento`. Nada é alterado ou apagado.
-- IDEMPOTENTE: cada bloco tem `not exists` — se rodar de novo, ou se um gatilho
-- já registrou o andamento, não duplica.
-- REGRA: o texto automático ("Prazo lançado — …", "Prazo cumprido em …") só
-- entra quando NÃO há texto humano (justificativa / observação de conclusão).
--
-- Roda como `postgres` (db push) → ignora a RLS de `andamento`, como os demais
-- backfills do repo.
-- ============================================================================

-- ── 1. Publicações do DJEN com processo vinculado ───────────────────────────
-- Mesmo resumo do gatilho `salvarComunicacoes` (lib/domain/publicacao.ts
-- resumoDaPublicacaoDjen). `publicacao.texto` já é salvo sem HTML.
insert into andamento
  (escritorio_id, processo_id, autor_membro_id, origem, publicacao_id, texto, criado_em)
select
  p.escritorio_id,
  p.processo_id,
  null,
  'publicacao_djen',
  p.id,
  'DJEN — '
    || concat_ws(' · ',
         coalesce(nullif(btrim(p.tipo_comunicacao), ''), 'Publicação'),
         nullif(btrim(p.nome_classe), ''),
         nullif(concat_ws(' — ', nullif(btrim(p.sigla_tribunal), ''),
                                 nullif(btrim(p.nome_orgao), '')), '')
       )
    || ' (disponibilizada em ' || to_char(p.data_disponibilizacao, 'DD/MM/YYYY') || ').'
    || case
         when coalesce(btrim(p.texto), '') = '' then ''
         when length(btrim(p.texto)) > 300 then E'\n' || left(btrim(p.texto), 299) || '…'
         else E'\n' || btrim(p.texto)
       end,
  p.criado_em
from publicacao p
where p.processo_id is not null
  and p.deletado_em is null
  and not exists (
    select 1 from andamento a
    where a.publicacao_id = p.id and a.origem = 'publicacao_djen'
  );

-- ── 2. Publicações arquivadas com motivo (processo já vinculado) ────────────
-- Mesmo texto do gatilho `arquivarPublicacao`. Valor gravado em status é
-- 'descartada' (constraint); na UI aparece como "arquivada".
insert into andamento
  (escritorio_id, processo_id, autor_membro_id, origem, publicacao_id, texto, criado_em)
select
  p.escritorio_id,
  p.processo_id,
  p.triado_por,
  'manual',
  p.id,
  'Publicação arquivada: ' || btrim(p.motivo_descarte),
  coalesce(p.triado_em, p.criado_em)
from publicacao p
where p.status = 'descartada'
  and p.processo_id is not null
  and p.deletado_em is null
  and coalesce(btrim(p.motivo_descarte), '') <> ''
  and not exists (
    select 1 from andamento a
    where a.publicacao_id = p.id and a.origem = 'manual'
  );

-- ── 3. Criação de atividade (prazo / compromisso / monitoramento) ───────────
-- Texto humano (atividade.descricao) quando houver; senão um resumo do que foi
-- lançado. Instâncias de recorrência ficam de fora (a série não é 1 atividade
-- e geraria dezenas de linhas iguais).
insert into andamento
  (escritorio_id, processo_id, autor_membro_id, origem, atividade_id, texto, criado_em)
select
  at.escritorio_id,
  at.processo_id,
  at.responsavel_id,
  'criacao_atividade',
  at.id,
  coalesce(
    nullif(btrim(at.descricao), ''),
    case at.tipo
      when 'prazo' then
        'Prazo lançado — '
        || coalesce(nullif(btrim(at.titulo), ''), ta.nome, 'prazo')
        || coalesce(' · fatal '   || to_char(ap.prazo_fatal,   'DD/MM/YYYY'), '')
        || coalesce(' · interno ' || to_char(ap.prazo_interno, 'DD/MM/YYYY'), '')
      when 'compromisso' then
        coalesce(nullif(btrim(at.titulo), ''), ta.nome, 'Compromisso')
        || ' — ' || to_char(at.data, 'DD/MM/YYYY')
        || coalesce(' ' || to_char(ac.hora, 'HH24:MI'), '')
        || case when coalesce(btrim(ac."local"), '') <> ''
                then ' · ' || btrim(ac."local") else '' end
      when 'monitoramento' then
        coalesce(nullif(btrim(at.titulo), ''), ta.nome, 'Monitoramento')
        || ' — verificar em ' || to_char(at.data, 'DD/MM/YYYY')
        || case when coalesce(btrim(am.alvo), '') <> ''
                then ' · ' || btrim(am.alvo) else '' end
      else coalesce(nullif(btrim(at.titulo), ''), ta.nome, 'Atividade')
    end
  ),
  at.criado_em
from atividade at
left join tipo_atividade       ta on ta.id = at.tipo_atividade_id
left join atividade_prazo       ap on ap.atividade_id = at.id
left join atividade_compromisso ac on ac.atividade_id = at.id
left join atividade_monitoramento am on am.atividade_id = at.id
where at.deletado_em is null
  and coalesce(at.e_instancia_recorrente, false) = false
  and not exists (
    select 1 from andamento a
    where a.atividade_id = at.id and a.origem = 'criacao_atividade'
  );

-- ── 4. Conclusão de atividade ──────────────────────────────────────────────
-- observacao_conclusao quando houver; senão "Prazo cumprido em …".
insert into andamento
  (escritorio_id, processo_id, autor_membro_id, origem, atividade_id, texto, criado_em)
select
  at.escritorio_id,
  at.processo_id,
  at.concluida_por,
  'conclusao_atividade',
  at.id,
  coalesce(
    nullif(btrim(at.observacao_conclusao), ''),
    case at.tipo
      when 'prazo'       then 'Prazo cumprido'
      when 'compromisso' then 'Compromisso realizado'
      else 'Monitoramento concluído'
    end
    || coalesce(' em ' || to_char(at.data_conclusao, 'DD/MM/YYYY'), '')
  ),
  -- atualizado_em ≈ momento da conclusão (o UPDATE que concluiu dispara o
  -- trigger). Se por acaso for null, a data da conclusão, garantindo que fique
  -- DEPOIS da criação da própria atividade.
  coalesce(
    at.atualizado_em,
    greatest(at.data_conclusao::timestamptz, at.criado_em + interval '1 minute')
  )
from atividade at
where at.deletado_em is null
  and at.status = 'concluida'
  and not exists (
    select 1 from andamento a
    where a.atividade_id = at.id and a.origem = 'conclusao_atividade'
  );

-- ── 5. Anotações (tabela `observacao`) ─────────────────────────────────────
-- Cobre anotações livres, cancelamentos e verificações de monitoramento.
insert into andamento
  (escritorio_id, processo_id, autor_membro_id, origem, atividade_id, texto, criado_em)
select
  o.escritorio_id,
  at.processo_id,
  o.autor_id,
  'observacao_atividade',
  o.atividade_id,
  o.texto,
  o.criado_em
from observacao o
join atividade at on at.id = o.atividade_id
where o.deletado_em is null
  and at.deletado_em is null
  and not exists (
    select 1 from andamento a
    where a.atividade_id = o.atividade_id
      and a.origem = 'observacao_atividade'
      and a.texto = o.texto
  );

-- ── 6. Ajustes manuais de prazo (`prazo_historico`) ───────────────────────
-- Um ajuste grava 2 linhas (prazo_fatal + prazo_interno) com o mesmo motivo;
-- distinct on colapsa em 1 andamento por evento.
insert into andamento
  (escritorio_id, processo_id, autor_membro_id, origem, atividade_id, texto, criado_em)
select distinct on (ph.atividade_id, ph.alterado_em)
  ph.escritorio_id,
  at.processo_id,
  ph.alterado_por,
  'ajuste_prazo',
  ph.atividade_id,
  btrim(ph.motivo),
  ph.alterado_em
from prazo_historico ph
join atividade at on at.id = ph.atividade_id
where at.deletado_em is null
  and ph.campo in ('prazo_fatal', 'prazo_interno')
  and coalesce(btrim(ph.motivo), '') <> ''
  and not exists (
    select 1 from andamento a
    where a.atividade_id = ph.atividade_id
      and a.origem = 'ajuste_prazo'
      and a.texto = btrim(ph.motivo)
  )
order by ph.atividade_id, ph.alterado_em;
