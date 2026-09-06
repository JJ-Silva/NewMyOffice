-- ============================================================================
-- 18 · Tramitação — fio cronológico de andamentos (feat/tramitacao)
-- ============================================================================
-- Um lugar único pra ver "o que aconteceu" num caso. Hoje isso está espalhado:
--   atividade.descricao / observacao_conclusao (por atividade)
--   observacao                                 (anotações e cancelamentos)
--   publicacao.motivo_descarte                 (publicações arquivadas)
-- — cada uma só na sua tela, sem ordem cronológica comum.
--
-- `andamento` é uma CÓPIA read-only pra exibição cronológica. A fonte de verdade
-- de cada fato continua na coluna de origem (nenhuma delas tem tela de edição
-- hoje, então não há risco real de desincronia). Ver docs/features/tramitacao.md.
--
-- Migration ADITIVA: cria 1 tabela nova. Não altera nenhuma tabela existente.
-- (O bloco de seed/backfill de `rotulo_permissao` no fim só INSERE linhas — os
--  membros que já viam a agenda passam a ver também a tramitação.)
-- ============================================================================

create table andamento (
  id            uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references escritorio (id) on delete cascade,
  processo_id   uuid not null references processo (id) on delete cascade,

  -- quem escreveu. NULL só quando origem = 'publicacao_djen' (conteúdo vindo do
  -- DJEN — não há pessoa por trás daquele fato específico). Todo o resto é
  -- atribuído a quem digitou.
  autor_membro_id uuid references membro (id),

  origem text not null check (origem in (
    'manual',               -- escrito direto na tela da Tramitação, sem vínculo
    'criacao_atividade',    -- justificativa preenchida ao criar prazo/compromisso/monitoramento
    'conclusao_atividade',  -- informação de conclusão (inclui monitoramento concluído por verificação)
    'observacao_atividade', -- adicionarObservacao: cancelamento, verificação com mudança, ou "anotar" livre
    'ajuste_prazo',         -- correção manual de prazo_fatal/prazo_interno (motivo obrigatório)
    'publicacao_djen'       -- publicação do DJEN que passou a ter processo_id (auto-match ou vínculo manual)
  )),

  -- links reais (FK), nunca texto solto fingindo ser link
  atividade_id  uuid references atividade (id) on delete set null,
  publicacao_id uuid references publicacao (id) on delete set null,

  texto text not null,

  criado_em   timestamptz not null default now(),
  deletado_em timestamptz
);

-- o fio de um processo, do mais recente pro mais antigo
create index andamento_por_processo
  on andamento (processo_id, criado_em desc) where deletado_em is null;

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- Mesmo padrão das demais tabelas de domínio pós-Etapa 6: tenant isolation
-- (escritorios_do_usuario) SOMADO à permissão de ver o grupo (tem_permissao).
-- Sem 'tramitacao.ver' o SELECT (e portanto UPDATE/DELETE) não devolve linha.
-- O INSERT só exige pertencer ao escritório — a checagem de 'tramitacao.criar'
-- é no app (exigirPermissao), igual ao resto.
alter table andamento enable row level security;
create policy andamento_rls on andamento for all
  using (escritorio_id in (select escritorios_do_usuario())
         and tem_permissao(escritorio_id, 'tramitacao.ver'))
  with check (escritorio_id in (select escritorios_do_usuario()));

-- ============================================================================
-- Permissões do grupo 'tramitacao' (catálogo vivo: lib/domain/permissoes.ts).
--   tramitacao.ver   → enxergar o fio + o RLS acima devolver linhas
--   tramitacao.criar → postar andamento manual na tela
--
-- semear_rotulos_padrao() é reescrita para incluir as duas chaves nos rótulos
-- que já ganham as permissões de agenda (novos escritórios). Para os que já
-- existem, o backfill abaixo dá 'tramitacao.ver'/'tramitacao.criar' a todo
-- rótulo que já tenha a permissão irmã de 'atividades' — quem já via/lançava
-- na agenda continua vendo/lançando na tramitação.
-- ============================================================================
create or replace function semear_rotulos_padrao(p_escritorio uuid)
returns uuid
language plpgsql
as $$
declare
  v_adv uuid;
  v_sec uuid;
  v_est uuid;
begin
  insert into rotulo (escritorio_id, nome, descricao)
    values (p_escritorio, 'Advogado',
            'Advogado(a) do escritório — acesso amplo ao trabalho, sem mexer na equipe.')
    returning id into v_adv;
  insert into rotulo (escritorio_id, nome, descricao)
    values (p_escritorio, 'Secretária / Recepção',
            'Apoio administrativo, agenda e triagem de publicações.')
    returning id into v_sec;
  insert into rotulo (escritorio_id, nome, descricao)
    values (p_escritorio, 'Estagiário',
            'Estagiário(a) — enxerga o trabalho e ajuda a lançar, sem exclusões.')
    returning id into v_est;

  insert into rotulo_permissao (rotulo_id, permissao)
  select v_adv, x from unnest(array[
    'clientes.ver','clientes.criar','clientes.editar','clientes.excluir',
    'pastas.ver','pastas.criar','pastas.editar','pastas.excluir',
    'processos.ver','processos.criar','processos.editar','processos.excluir',
    'atividades.ver','atividades.criar','atividades.concluir',
      'atividades.ajustar_prazo','atividades.excluir',
    'recorrencias.gerenciar',
    'tramitacao.ver','tramitacao.criar',
    'publicacoes.ver','publicacoes.triar','publicacoes.arquivar','oab.gerenciar',
    'relatorios.ver',
    'config.tribunais','config.catalogos'
  ]) as x;

  insert into rotulo_permissao (rotulo_id, permissao)
  select v_sec, x from unnest(array[
    'clientes.ver','clientes.criar','clientes.editar',
    'pastas.ver',
    'processos.ver',
    'atividades.ver','atividades.criar','atividades.concluir',
    'recorrencias.gerenciar',
    'tramitacao.ver','tramitacao.criar',
    'publicacoes.ver','publicacoes.triar','publicacoes.arquivar'
  ]) as x;

  insert into rotulo_permissao (rotulo_id, permissao)
  select v_est, x from unnest(array[
    'clientes.ver',
    'pastas.ver',
    'processos.ver',
    'atividades.ver','atividades.criar','atividades.concluir',
    'tramitacao.ver','tramitacao.criar',
    'publicacoes.ver'
  ]) as x;

  return v_adv;
end;
$$;

-- Backfill dos rótulos que já existem: espelha a permissão irmã de 'atividades'.
insert into rotulo_permissao (rotulo_id, permissao)
select rp.rotulo_id, 'tramitacao.ver'
from rotulo_permissao rp
where rp.permissao = 'atividades.ver'
on conflict do nothing;

insert into rotulo_permissao (rotulo_id, permissao)
select rp.rotulo_id, 'tramitacao.criar'
from rotulo_permissao rp
where rp.permissao = 'atividades.criar'
on conflict do nothing;
