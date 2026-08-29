-- ============================================================================
-- 06 · Atividade — base + os 3 tipos (§3.6)
-- ============================================================================
-- atividade (base) + tabela de detalhe por tipo:
--   prazo         → atividade_prazo         (tem motor de cálculo)
--   compromisso   → atividade_compromisso   (data + hora/local)
--   monitoramento → atividade_monitoramento (verificar algo)
-- `atividade.data` é a fonte única de data para a agenda e a prioridade.
-- Para o tipo prazo, `atividade.data` é mantida = `atividade_prazo.prazo_fatal`
-- por trigger (o campo "adotado", que pode ter sido ajustado à mão).
-- ============================================================================

-- Configuração de contagem do prazo (tabela referenciada por atividade_prazo).
create table configuracao_contagem (
  id            uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references escritorio (id) on delete cascade,
  dobro         boolean not null default false,   -- prazo em dobro (situação da parte)
  natureza      text not null check (natureza in ('processual', 'material', 'interna')),
  dias          int  not null,                    -- copiado de tipo_atividade.dias_padrao, editável
  criado_em     timestamptz not null default now(),
  deletado_em   timestamptz
);
alter table configuracao_contagem enable row level security;
create policy configuracao_contagem_do_escritorio on configuracao_contagem for all
  using (escritorio_id in (select escritorios_do_usuario()))
  with check (escritorio_id in (select escritorios_do_usuario()));

-- ── Atividade (base) ────────────────────────────────────────────────────────
create table atividade (
  id                        uuid primary key default gen_random_uuid(),
  escritorio_id             uuid not null references escritorio (id) on delete cascade,
  processo_id               uuid not null references processo (id) on delete cascade,
  tipo                      text not null check (tipo in ('prazo', 'compromisso', 'monitoramento')),
  tipo_atividade_id         uuid references tipo_atividade (id),
  titulo                    text not null,          -- pré-preenchido com tipo_atividade.nome; editável
  descricao                 text,
  data                      date not null,          -- prazo fatal | data do compromisso | dia da verificação
  responsavel_id            uuid references membro (id),
  prioridade_manual         text not null default 'media'
                              check (prioridade_manual in ('baixa', 'media', 'alta', 'urgente')),
  -- prioridade_efetiva NÃO é coluna — é calculada em lib/domain/atividade.ts
  status                    text not null default 'pendente'
                              check (status in ('pendente', 'em_andamento', 'concluida', 'cancelada')),
  data_conclusao            date,
  concluida_por             uuid references membro (id),
  observacao_conclusao      text,
  dias_antes_visivel_custom int,                    -- sobrepõe o padrão do tipo, por atividade
  -- recorrência: colunas já existem nulas; o motor de recorrência é a Etapa 3a
  recorrencia_id            uuid,
  e_instancia_recorrente    boolean not null default false,
  atividade_origem_id       uuid references atividade (id),
  criado_em                 timestamptz not null default now(),
  atualizado_em             timestamptz,
  deletado_em               timestamptz
);
-- "atrasada/vencida" = derivado (status='pendente' AND data < current_date), não é coluna.
create index atividade_agenda
  on atividade (escritorio_id, status, data) where deletado_em is null;
create index atividade_por_processo   on atividade (processo_id)    where deletado_em is null;
create index atividade_por_responsavel on atividade (responsavel_id) where deletado_em is null;
create trigger atividade_atualizado before update on atividade
  for each row execute function set_atualizado_em();

alter table atividade enable row level security;
create policy atividade_do_escritorio on atividade for all
  using (escritorio_id in (select escritorios_do_usuario()))
  with check (escritorio_id in (select escritorios_do_usuario()));

-- ── Detalhe: PRAZO (= DeadlineActivity) ─────────────────────────────────────
create table atividade_prazo (
  atividade_id                 uuid primary key references atividade (id) on delete cascade,
  escritorio_id                uuid not null references escritorio (id) on delete cascade,
  configuracao_contagem_id     uuid not null references configuracao_contagem (id),
  tribunal_id                  uuid references tribunal (id),  -- obrigatório p/ natureza='processual'
  -- termo inicial (evento)
  evento_tipo                  text not null check (evento_tipo in
                                 ('disponibilizacao_djen', 'intimacao_pessoal', 'juntada', 'ciencia', 'outro')),
  evento_data                  date not null,   -- é o "dia 1" da contagem (Opção A)
  evento_descricao             text,
  excluir_feriados             boolean not null default true,
  -- datas: calculada + adotada
  prazo_fatal_calculado        date,
  prazo_fatal                  date not null,   -- ADOTADA. atividade.data é mantida igual a esta.
  prazo_fatal_ajustado_manual  boolean not null default false,
  prazo_interno_calculado      date,
  prazo_interno                date not null,
  prazo_interno_ajustado_manual boolean not null default false,
  prazo_apertado               boolean not null default false,
  motivo_ajuste                text,
  calculo_desatualizado        boolean not null default false,
  memoria_calculo              jsonb,
  -- motivo obrigatório quando houve ajuste manual
  check (
    not (prazo_fatal_ajustado_manual or prazo_interno_ajustado_manual)
    or (motivo_ajuste is not null and length(btrim(motivo_ajuste)) > 0)
  )
);
create index atividade_prazo_por_fatal    on atividade_prazo (escritorio_id, prazo_fatal);
create index atividade_prazo_por_tribunal on atividade_prazo (tribunal_id);

alter table atividade_prazo enable row level security;
create policy atividade_prazo_do_escritorio on atividade_prazo for all
  using (escritorio_id in (select escritorios_do_usuario()))
  with check (escritorio_id in (select escritorios_do_usuario()));

-- Mantém atividade.data = atividade_prazo.prazo_fatal (a data que vale).
-- É o único ponto que sincroniza as duas — não repetir isso no código da app.
create or replace function sincronizar_data_do_prazo()
returns trigger
language plpgsql
as $$
begin
  update atividade set data = new.prazo_fatal where id = new.atividade_id;
  return new;
end;
$$;
create trigger atividade_prazo_sincroniza_data
  after insert or update of prazo_fatal on atividade_prazo
  for each row execute function sincronizar_data_do_prazo();

-- ── Detalhe: COMPROMISSO (= AppointmentActivity) — usado a partir das semanas 3-4 ──
create table atividade_compromisso (
  atividade_id         uuid primary key references atividade (id) on delete cascade,
  escritorio_id        uuid not null references escritorio (id) on delete cascade,
  hora                 time,
  local                text,
  duracao_estimada_min int
);
alter table atividade_compromisso enable row level security;
create policy atividade_compromisso_do_escritorio on atividade_compromisso for all
  using (escritorio_id in (select escritorios_do_usuario()))
  with check (escritorio_id in (select escritorios_do_usuario()));

-- ── Detalhe: MONITORAMENTO (= MonitoringActivity) — semanas 3-4 ─────────────
create table atividade_monitoramento (
  atividade_id       uuid primary key references atividade (id) on delete cascade,
  escritorio_id      uuid not null references escritorio (id) on delete cascade,
  alvo               text,
  ultima_verificacao timestamptz
);
alter table atividade_monitoramento enable row level security;
create policy atividade_monitoramento_do_escritorio on atividade_monitoramento for all
  using (escritorio_id in (select escritorios_do_usuario()))
  with check (escritorio_id in (select escritorios_do_usuario()));

-- ── Observações (anotações livres — não alteram datas nem cálculo) ──────────
create table observacao (
  id            uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references escritorio (id) on delete cascade,
  atividade_id  uuid not null references atividade (id) on delete cascade,
  texto         text not null,
  autor_id      uuid references membro (id),
  criado_em     timestamptz not null default now(),
  deletado_em   timestamptz
);
create index observacao_por_atividade on observacao (atividade_id) where deletado_em is null;

alter table observacao enable row level security;
create policy observacao_do_escritorio on observacao for all
  using (escritorio_id in (select escritorios_do_usuario()))
  with check (escritorio_id in (select escritorios_do_usuario()));

-- ── Histórico do prazo (auditoria da parte legalmente sensível) ─────────────
create table prazo_historico (
  id             uuid primary key default gen_random_uuid(),
  escritorio_id  uuid not null references escritorio (id) on delete cascade,
  atividade_id   uuid not null references atividade (id) on delete cascade,
  alterado_por   uuid references membro (id),
  alterado_em    timestamptz not null default now(),
  campo          text not null,   -- prazo_fatal | prazo_interno | evento_data | evento_tipo | tipo_atividade | configuracao | status
  valor_anterior jsonb,
  valor_novo     jsonb,
  motivo         text
);
create index prazo_historico_por_atividade on prazo_historico (atividade_id, alterado_em desc);

alter table prazo_historico enable row level security;
create policy prazo_historico_do_escritorio on prazo_historico for all
  using (escritorio_id in (select escritorios_do_usuario()))
  with check (escritorio_id in (select escritorios_do_usuario()));
