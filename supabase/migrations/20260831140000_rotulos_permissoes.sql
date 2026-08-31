-- ============================================================================
-- 13 · Etapa 6 — Rótulos, permissões e "sócio fundador" (§2 roadmap 6, §5 P6)
-- ============================================================================
-- Substitui o papel fixo ('dono'|'advogado'|'secretaria') por um modelo aberto:
--
--   rotulo            = a função da pessoa no escritório (o escritório cria)
--   rotulo_permissao  = as permissões daquele rótulo (linha existe = permitido)
--   membro.rotulo_id  = o rótulo da pessoa
--   membro_permissao  = override por pessoa (concedida = true/false)
--   membro.fundador   = quem criou o escritório. Passa por cima de tudo,
--                       não perde acesso, não é um rótulo. (imutável no MVP)
--
-- O catálogo de chaves de permissão vive em lib/domain/permissoes.ts — a
-- função `semear_rotulos_padrao` abaixo tem de repetir as mesmas strings.
--
-- Visibilidade também é permissão: sem `<grupo>.ver` o RLS não devolve a linha.
-- A checagem fina de escrita (.criar/.editar/.excluir) fica no app (podeFazer).
-- ============================================================================

-- ── Rótulo ──────────────────────────────────────────────────────────────────
create table rotulo (
  id            uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references escritorio (id) on delete cascade,
  nome          text not null,
  descricao     text,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz,
  deletado_em   timestamptz
);
create unique index rotulo_nome_por_escritorio
  on rotulo (escritorio_id, lower(nome)) where deletado_em is null;
create index rotulo_por_escritorio
  on rotulo (escritorio_id) where deletado_em is null;
create trigger rotulo_atualizado before update on rotulo
  for each row execute function set_atualizado_em();

-- ── Permissões do rótulo ────────────────────────────────────────────────────
create table rotulo_permissao (
  rotulo_id uuid not null references rotulo (id) on delete cascade,
  permissao text not null,
  primary key (rotulo_id, permissao)
);

-- ── Override por pessoa ─────────────────────────────────────────────────────
create table membro_permissao (
  membro_id uuid not null references membro (id) on delete cascade,
  permissao text not null,
  concedida boolean not null,          -- true = concede, false = tira
  primary key (membro_id, permissao)
);

-- ── Colunas novas em membro ─────────────────────────────────────────────────
-- `papel` continua na tabela (histórico); o código não usa mais.
alter table membro add column fundador  boolean not null default false;
alter table membro add column rotulo_id uuid references rotulo (id);
create index membro_por_rotulo on membro (rotulo_id) where deletado_em is null;

-- ============================================================================
-- Semente dos rótulos-padrão de um escritório.
-- Espelha os PRESET_* de lib/domain/permissoes.ts. Devolve o id do rótulo
-- "Advogado" (o padrão de quem entra no escritório).
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
    'publicacoes.ver','publicacoes.triar','publicacoes.arquivar'
  ]) as x;

  insert into rotulo_permissao (rotulo_id, permissao)
  select v_est, x from unnest(array[
    'clientes.ver',
    'pastas.ver',
    'processos.ver',
    'atividades.ver','atividades.criar','atividades.concluir',
    'publicacoes.ver'
  ]) as x;

  return v_adv;
end;
$$;

-- ============================================================================
-- tem_permissao(escritorio, permissao) — a mesma regra de lib/domain/autorizacao.
--   fundador → sempre true
--   senão: override do membro, se existir; senão o rótulo; senão false
-- security definer: lê membro/rotulo_permissao/membro_permissao sem depender
-- da RLS dessas tabelas (evita recursão nas políticas).
-- ============================================================================
create or replace function tem_permissao(p_escritorio uuid, p_permissao text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from membro m
    where m.usuario_id = auth.uid()
      and m.escritorio_id = p_escritorio
      and m.ativo
      and m.deletado_em is null
      and (
        m.fundador
        or coalesce(
             (select mp.concedida
                from membro_permissao mp
               where mp.membro_id = m.id
                 and mp.permissao = p_permissao),
             (select true
                from rotulo_permissao rp
               where rp.rotulo_id = m.rotulo_id
                 and rp.permissao = p_permissao),
             false
           )
      )
  );
$$;

-- ── RLS das tabelas novas ───────────────────────────────────────────────────
alter table rotulo enable row level security;
-- qualquer membro do escritório enxerga os rótulos (para exibir na equipe);
-- só quem tem 'rotulos.gerenciar' (ou o fundador) escreve.
create policy rotulo_visivel on rotulo for select
  using (escritorio_id in (select escritorios_do_usuario()));
create policy rotulo_gerencia on rotulo for all
  using (tem_permissao(escritorio_id, 'rotulos.gerenciar'))
  with check (tem_permissao(escritorio_id, 'rotulos.gerenciar'));

alter table rotulo_permissao enable row level security;
create policy rotulo_permissao_visivel on rotulo_permissao for select
  using (rotulo_id in (
    select id from rotulo where escritorio_id in (select escritorios_do_usuario())
  ));
create policy rotulo_permissao_gerencia on rotulo_permissao for all
  using (rotulo_id in (
    select id from rotulo where tem_permissao(escritorio_id, 'rotulos.gerenciar')
  ))
  with check (rotulo_id in (
    select id from rotulo where tem_permissao(escritorio_id, 'rotulos.gerenciar')
  ));

alter table membro_permissao enable row level security;
create policy membro_permissao_visivel on membro_permissao for select
  using (membro_id in (
    select id from membro
    where usuario_id = auth.uid()
       or escritorio_id in (select escritorios_do_usuario())
  ));
create policy membro_permissao_gerencia on membro_permissao for all
  using (membro_id in (
    select id from membro where tem_permissao(escritorio_id, 'membros.gerenciar')
  ))
  with check (membro_id in (
    select id from membro where tem_permissao(escritorio_id, 'membros.gerenciar')
  ));

-- ── membro: restringe a ESCRITA a quem tem 'membros.gerenciar' ──────────────
-- (o SELECT continua aberto pela policy `membro_visivel`, criada na migration 02;
--  a policy `membro_gerencia` era for-all sem gate fino — trocamos.)
drop policy membro_gerencia on membro;
create policy membro_gerencia on membro for all
  using (tem_permissao(escritorio_id, 'membros.gerenciar'))
  with check (escritorio_id in (select escritorios_do_usuario()));

-- ============================================================================
-- Tabelas de domínio: o SELECT (e portanto UPDATE/DELETE) passa a exigir o
-- `<grupo>.ver`. O INSERT segue só exigindo pertencer ao escritório — a
-- checagem fina de criação é no app (podeFazer). Catálogos (area, tipo_atividade,
-- tribunal, feriado, ...) continuam visíveis a qualquer membro: são necessários
-- para montar os formulários; a escrita neles é gated no app.
-- ============================================================================

-- helper local: troca a policy "<t>_do_escritorio for all" por uma que soma a
-- permissão de ver. Feito à mão tabela a tabela para ficar auditável.

-- clientes.ver
drop policy cliente_do_escritorio on cliente;
create policy cliente_rls on cliente for all
  using (escritorio_id in (select escritorios_do_usuario())
         and tem_permissao(escritorio_id, 'clientes.ver'))
  with check (escritorio_id in (select escritorios_do_usuario()));

-- pastas.ver
drop policy pasta_do_escritorio on pasta;
create policy pasta_rls on pasta for all
  using (escritorio_id in (select escritorios_do_usuario())
         and tem_permissao(escritorio_id, 'pastas.ver'))
  with check (escritorio_id in (select escritorios_do_usuario()));

drop policy pasta_cliente_do_escritorio on pasta_cliente;
create policy pasta_cliente_rls on pasta_cliente for all
  using (exists (
    select 1 from pasta p
    where p.id = pasta_cliente.pasta_id
      and p.escritorio_id in (select escritorios_do_usuario())
      and tem_permissao(p.escritorio_id, 'pastas.ver')
  ))
  with check (exists (
    select 1 from pasta p
    where p.id = pasta_cliente.pasta_id
      and p.escritorio_id in (select escritorios_do_usuario())
  ));

-- processos.ver
drop policy processo_do_escritorio on processo;
create policy processo_rls on processo for all
  using (escritorio_id in (select escritorios_do_usuario())
         and tem_permissao(escritorio_id, 'processos.ver'))
  with check (escritorio_id in (select escritorios_do_usuario()));

drop policy processo_judicial_do_escritorio on processo_judicial;
create policy processo_judicial_rls on processo_judicial for all
  using (escritorio_id in (select escritorios_do_usuario())
         and tem_permissao(escritorio_id, 'processos.ver'))
  with check (escritorio_id in (select escritorios_do_usuario()));

drop policy processo_administrativo_do_escritorio on processo_administrativo;
create policy processo_administrativo_rls on processo_administrativo for all
  using (escritorio_id in (select escritorios_do_usuario())
         and tem_permissao(escritorio_id, 'processos.ver'))
  with check (escritorio_id in (select escritorios_do_usuario()));

drop policy parte_do_escritorio on parte;
create policy parte_rls on parte for all
  using (escritorio_id in (select escritorios_do_usuario())
         and tem_permissao(escritorio_id, 'processos.ver'))
  with check (escritorio_id in (select escritorios_do_usuario()));

-- atividades.ver
drop policy atividade_do_escritorio on atividade;
create policy atividade_rls on atividade for all
  using (escritorio_id in (select escritorios_do_usuario())
         and tem_permissao(escritorio_id, 'atividades.ver'))
  with check (escritorio_id in (select escritorios_do_usuario()));

drop policy atividade_prazo_do_escritorio on atividade_prazo;
create policy atividade_prazo_rls on atividade_prazo for all
  using (escritorio_id in (select escritorios_do_usuario())
         and tem_permissao(escritorio_id, 'atividades.ver'))
  with check (escritorio_id in (select escritorios_do_usuario()));

drop policy atividade_compromisso_do_escritorio on atividade_compromisso;
create policy atividade_compromisso_rls on atividade_compromisso for all
  using (escritorio_id in (select escritorios_do_usuario())
         and tem_permissao(escritorio_id, 'atividades.ver'))
  with check (escritorio_id in (select escritorios_do_usuario()));

drop policy atividade_monitoramento_do_escritorio on atividade_monitoramento;
create policy atividade_monitoramento_rls on atividade_monitoramento for all
  using (escritorio_id in (select escritorios_do_usuario())
         and tem_permissao(escritorio_id, 'atividades.ver'))
  with check (escritorio_id in (select escritorios_do_usuario()));

drop policy observacao_do_escritorio on observacao;
create policy observacao_rls on observacao for all
  using (escritorio_id in (select escritorios_do_usuario())
         and tem_permissao(escritorio_id, 'atividades.ver'))
  with check (escritorio_id in (select escritorios_do_usuario()));

drop policy prazo_historico_do_escritorio on prazo_historico;
create policy prazo_historico_rls on prazo_historico for all
  using (escritorio_id in (select escritorios_do_usuario())
         and tem_permissao(escritorio_id, 'atividades.ver'))
  with check (escritorio_id in (select escritorios_do_usuario()));

drop policy configuracao_contagem_do_escritorio on configuracao_contagem;
create policy configuracao_contagem_rls on configuracao_contagem for all
  using (escritorio_id in (select escritorios_do_usuario())
         and tem_permissao(escritorio_id, 'atividades.ver'))
  with check (escritorio_id in (select escritorios_do_usuario()));

drop policy atividade_recorrencia_do_escritorio on atividade_recorrencia;
create policy atividade_recorrencia_rls on atividade_recorrencia for all
  using (escritorio_id in (select escritorios_do_usuario())
         and tem_permissao(escritorio_id, 'atividades.ver'))
  with check (escritorio_id in (select escritorios_do_usuario()));

-- publicacoes.ver
drop policy publicacao_do_escritorio on publicacao;
create policy publicacao_rls on publicacao for all
  using (escritorio_id in (select escritorios_do_usuario())
         and tem_permissao(escritorio_id, 'publicacoes.ver'))
  with check (escritorio_id in (select escritorios_do_usuario()));

drop policy oab_monitorada_do_escritorio on oab_monitorada;
create policy oab_monitorada_rls on oab_monitorada for all
  using (escritorio_id in (select escritorios_do_usuario())
         and tem_permissao(escritorio_id, 'publicacoes.ver'))
  with check (escritorio_id in (select escritorios_do_usuario()));

-- ============================================================================
-- Onboarding: passa a semear os rótulos e marcar o criador como fundador.
-- ============================================================================
create or replace function onboarding_criar_escritorio(p_nome text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid           uuid := auth.uid();
  v_escritorio_id uuid;
  v_rotulo_adv    uuid;
begin
  if v_uid is null then
    raise exception 'É preciso estar autenticado para criar um escritório.';
  end if;
  if coalesce(btrim(p_nome), '') = '' then
    raise exception 'Informe o nome do escritório.';
  end if;

  insert into escritorio (nome) values (btrim(p_nome))
    returning id into v_escritorio_id;

  insert into configuracao_escritorio (escritorio_id)
    values (v_escritorio_id);

  -- rótulos-padrão; o criador entra como fundador + rótulo "Advogado"
  v_rotulo_adv := semear_rotulos_padrao(v_escritorio_id);

  insert into membro (usuario_id, escritorio_id, papel, fundador, rotulo_id)
    values (v_uid, v_escritorio_id, 'dono', true, v_rotulo_adv);

  -- ── Áreas padrão ──────────────────────────────────────────────────────────
  insert into area (escritorio_id, nome, ordem)
  select v_escritorio_id, nome, ordem
  from (values
    ('Cível', 1), ('Trabalhista', 2), ('Criminal', 3), ('Tributário', 4),
    ('Previdenciário', 5), ('Família', 6), ('Empresarial', 7), ('Imobiliário', 8),
    ('Consumidor', 9), ('Administrativo', 10), ('Consultivo', 11)
  ) as a(nome, ordem);

  -- ── Tipos de atividade padrão (§4.A.4) ────────────────────────────────────
  insert into tipo_atividade
    (escritorio_id, nome, aplica_a, dias_padrao, natureza, exige_peca, categoria)
  select v_escritorio_id, nome, aplica_a, dias_padrao, natureza, exige_peca, categoria
  from (values
    ('Contestação',                                'prazo', 15,   'processual', true,  'resposta'),
    ('Réplica',                                    'prazo', 15,   'processual', true,  'resposta'),
    ('Apelação',                                   'prazo', 15,   'processual', true,  'recurso'),
    ('Contrarrazões de apelação',                  'prazo', 15,   'processual', true,  'recurso'),
    ('Agravo de instrumento',                      'prazo', 15,   'processual', true,  'recurso'),
    ('Embargos de declaração',                     'prazo', 5,    'processual', true,  'recurso'),
    ('Recurso especial / extraordinário',          'prazo', 15,   'processual', true,  'recurso'),
    ('Contrarrazões a REsp/RE',                    'prazo', 15,   'processual', true,  'recurso'),
    ('Manifestação sobre documentos/laudo',        'prazo', 15,   'processual', false, 'manifestacao'),
    ('Especificação de provas',                    'prazo', 5,    'processual', false, 'manifestacao'),
    ('Cumprimento de sentença — pagamento voluntário','prazo', 15, 'processual', false, 'cumprimento'),
    ('Impugnação ao cumprimento de sentença',      'prazo', 15,   'processual', true,  'cumprimento'),
    ('Embargos à execução',                        'prazo', 15,   'processual', true,  'resposta'),
    ('Alegações finais / memoriais',               'prazo', 15,   'processual', true,  'manifestacao'),
    ('Interna — elaboração de peça/contrato',       'prazo', null, 'interna',    true,  'providencia_interna'),
    ('Interna — organização de documentos',        'prazo', null, 'interna',    false, 'providencia_interna'),
    ('Prazo próprio do cliente',                   'prazo', null, 'interna',    false, 'providencia_interna'),
    ('Outro / livre — processual',                 'prazo', null, 'processual', false, null),
    ('Audiência',                                  'compromisso', null, null, false, null),
    ('Reunião com cliente',                        'compromisso', null, null, false, null),
    ('Perícia',                                    'compromisso', null, null, false, null),
    ('Sustentação oral',                           'compromisso', null, null, false, null),
    ('Despacho com juiz',                          'compromisso', null, null, false, null),
    ('Verificar publicação',                       'monitoramento', null, null, false, null),
    ('Acompanhar andamento processual',            'monitoramento', null, null, false, null),
    ('Verificar certidão',                         'monitoramento', null, null, false, null),
    ('Conferência de pasta',                       'monitoramento', null, null, false, null)
  ) as t(nome, aplica_a, dias_padrao, natureza, exige_peca, categoria);

  return v_escritorio_id;
end;
$$;

comment on function onboarding_criar_escritorio(text) is
  'Cria o escritório do usuário logado (membro fundador + rótulo Advogado), a configuração, os rótulos-padrão e os catálogos (area, tipo_atividade). Retorna o id do escritório.';

-- ============================================================================
-- Backfill dos escritórios que já existem.
-- ============================================================================
do $$
declare
  e record;
  v_adv uuid;
begin
  for e in select id from escritorio where deletado_em is null loop
    -- pula se já tiver rótulos (migration reaplicada)
    if exists (select 1 from rotulo where escritorio_id = e.id) then
      continue;
    end if;

    v_adv := semear_rotulos_padrao(e.id);

    -- quem era 'dono' vira fundador
    update membro
       set fundador = true
     where escritorio_id = e.id and papel = 'dono';

    -- rótulo de cada membro conforme o papel antigo
    update membro m
       set rotulo_id = (
         select r.id from rotulo r
         where r.escritorio_id = e.id
           and r.nome = case
             when m.papel = 'secretaria' then 'Secretária / Recepção'
             else 'Advogado'
           end
       )
     where m.escritorio_id = e.id and m.rotulo_id is null;
  end loop;
end;
$$;
