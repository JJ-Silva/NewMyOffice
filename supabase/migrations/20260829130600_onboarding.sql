-- ============================================================================
-- 07 · Onboarding — cria o escritório e copia os catálogos-padrão (§3.1)
-- ============================================================================
-- Chamada pela app logo após o cadastro:
--   const { data: escritorioId } = await supabase.rpc('onboarding_criar_escritorio', { p_nome })
-- security definer: contorna a RLS para poder inserir o primeiro escritório/membro.
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
begin
  if v_uid is null then
    raise exception 'É preciso estar autenticado para criar um escritório.';
  end if;
  if coalesce(btrim(p_nome), '') = '' then
    raise exception 'Informe o nome do escritório.';
  end if;

  insert into escritorio (nome) values (btrim(p_nome))
    returning id into v_escritorio_id;

  insert into membro (usuario_id, escritorio_id, papel)
    values (v_uid, v_escritorio_id, 'dono');

  insert into configuracao_escritorio (escritorio_id)
    values (v_escritorio_id);

  -- ── Áreas padrão ──────────────────────────────────────────────────────────
  insert into area (escritorio_id, nome, ordem)
  select v_escritorio_id, nome, ordem
  from (values
    ('Cível', 1), ('Trabalhista', 2), ('Criminal', 3), ('Tributário', 4),
    ('Previdenciário', 5), ('Família', 6), ('Empresarial', 7), ('Imobiliário', 8),
    ('Consumidor', 9), ('Administrativo', 10), ('Consultivo', 11)
  ) as a(nome, ordem);

  -- ── Tipos de atividade padrão (§4.A.4) ────────────────────────────────────
  -- A 1ª linha tem todos os campos preenchidos para fixar os tipos das colunas.
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

grant execute on function onboarding_criar_escritorio(text) to authenticated;

comment on function onboarding_criar_escritorio(text) is
  'Cria o escritório do usuário logado (papel dono), a configuração e os catálogos-padrão (area, tipo_atividade). Retorna o id do escritório.';
