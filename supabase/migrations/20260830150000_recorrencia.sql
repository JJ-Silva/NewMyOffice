-- ============================================================================
-- 09 · Etapa 3a — recorrência de atividades (compromisso e monitoramento)
-- ============================================================================
-- Plano §2 (roadmap 3a) e §3.6: só `compromisso` e `monitoramento` recorrem —
-- `prazo` NUNCA (REGRAS_TIPO.prazo.podeRecorrer = false).
--
-- `atividade_recorrencia` guarda o TEMPLATE da atividade (o que copiar em cada
-- instância) + a REGRA (padrão de repetição + condição de fim). O motor puro
-- que gera as datas está em lib/domain/recorrencia.ts; quem cria as linhas
-- `atividade` a partir delas é lib/db/recorrencias.ts.
--
-- A base `atividade` (migration 06) já tem as colunas de recorrência nulas:
--   recorrencia_id, e_instancia_recorrente, atividade_origem_id.
-- Aqui a `recorrencia_id` ganha a FK (não dava para criar antes da tabela).
-- ============================================================================

create table atividade_recorrencia (
  id                        uuid primary key default gen_random_uuid(),
  escritorio_id             uuid not null references escritorio (id) on delete cascade,

  -- ── Template da atividade a repetir ─────────────────────────────────────
  atividade_tipo            text not null
                              check (atividade_tipo in ('compromisso', 'monitoramento')),
  processo_id               uuid not null references processo (id) on delete cascade,
  tipo_atividade_id         uuid references tipo_atividade (id),
  titulo                    text not null,
  descricao                 text,
  responsavel_id            uuid references membro (id),
  prioridade_manual         text not null default 'media'
                              check (prioridade_manual in ('baixa', 'media', 'alta', 'urgente')),
  dias_antes_visivel_custom int,
  -- detalhe do compromisso (usado só quando atividade_tipo = 'compromisso')
  hora                      time,
  local                     text,
  duracao_estimada_min      int,
  -- detalhe do monitoramento (usado só quando atividade_tipo = 'monitoramento')
  alvo                      text,

  -- ── Regra de repetição ─────────────────────────────────────────────────
  data_base                 date not null,   -- âncora / primeira data candidata
  periodicidade_tipo        text not null
                              check (periodicidade_tipo in ('intervalo', 'semanal', 'mensal')),
  -- periodicidade_tipo = 'intervalo': a cada N dias | semanas | meses
  intervalo_cada            int,
  intervalo_unidade         text check (intervalo_unidade in ('dias', 'semanas', 'meses')),
  -- periodicidade_tipo = 'semanal': dias marcados (0 = domingo … 6 = sábado)
  dias_da_semana            int[],
  -- periodicidade_tipo = 'mensal': dia do mês (fora do mês → último dia)
  dia_do_mes                int check (dia_do_mes between 1 and 31),

  -- ── Condição de fim ────────────────────────────────────────────────────
  termino_tipo              text not null
                              check (termino_tipo in ('data', 'ocorrencias', 'indefinido')),
  termino_ate               date,   -- termino_tipo = 'data'
  termino_ocorrencias       int,    -- termino_tipo = 'ocorrencias'

  -- ── Estado ─────────────────────────────────────────────────────────────
  ativa                     boolean not null default true,   -- encerrar = deixa de gerar
  criado_em                 timestamptz not null default now(),
  atualizado_em             timestamptz,
  deletado_em               timestamptz,

  -- coerência mínima entre o padrão escolhido e seus campos
  check (periodicidade_tipo <> 'intervalo'
         or (intervalo_cada is not null and intervalo_unidade is not null)),
  check (periodicidade_tipo <> 'semanal'
         or (dias_da_semana is not null and array_length(dias_da_semana, 1) >= 1)),
  check (periodicidade_tipo <> 'mensal' or dia_do_mes is not null),
  check (termino_tipo <> 'data' or termino_ate is not null),
  check (termino_tipo <> 'ocorrencias' or termino_ocorrencias >= 1)
);

create index atividade_recorrencia_do_escritorio
  on atividade_recorrencia (escritorio_id) where deletado_em is null;
create index atividade_recorrencia_ativas
  on atividade_recorrencia (escritorio_id) where ativa and deletado_em is null;
create index atividade_recorrencia_por_processo
  on atividade_recorrencia (processo_id) where deletado_em is null;

create trigger atividade_recorrencia_atualizado before update on atividade_recorrencia
  for each row execute function set_atualizado_em();

alter table atividade_recorrencia enable row level security;
create policy atividade_recorrencia_do_escritorio on atividade_recorrencia for all
  using (escritorio_id in (select escritorios_do_usuario()))
  with check (escritorio_id in (select escritorios_do_usuario()));

-- ── Liga a base `atividade` à recorrência que a gerou ──────────────────────
-- on delete set null: apagar a régua não apaga o histórico já materializado.
alter table atividade
  add constraint atividade_recorrencia_fk
  foreign key (recorrencia_id) references atividade_recorrencia (id) on delete set null;

-- Uma série não gera duas instâncias para a mesma data (guarda contra corrida
-- de materialização). O motor (lib/domain) também não propõe duplicatas.
create unique index atividade_recorrencia_data_unica
  on atividade (recorrencia_id, data)
  where recorrencia_id is not null and deletado_em is null;
