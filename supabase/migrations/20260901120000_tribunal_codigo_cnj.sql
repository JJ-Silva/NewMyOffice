-- ============================================================================
-- 16 · Tribunal identificado pelo número CNJ
-- ============================================================================
-- O número CNJ já traz segmento (J) + tribunal (TR). Em vez de o escritório
-- cadastrar tribunais à mão, o app identifica pelo número (lib/domain/
-- tribunais-cnj.ts) e cria a linha aqui sozinho na 1ª vez que precisar dela
-- (para pendurar os feriados locais da comarca).
--
-- `codigo_cnj` = segmento*100 + tribunal  (826 = TJSP, 500 = TST, 403 = TRF3ª).
-- ============================================================================

alter table tribunal add column codigo_cnj int;

-- um tribunal por código por escritório (os cadastrados à mão ficam com null)
create unique index tribunal_codigo_cnj_por_escritorio
  on tribunal (escritorio_id, codigo_cnj)
  where codigo_cnj is not null and deletado_em is null;

-- ── Backfill: liga os processos judiciais que já existem ao seu tribunal ─────
-- Snapshot da tabela (Res. CNJ 65/2008) — a fonte viva é lib/domain/tribunais-cnj.ts.
do $$
declare
  r        record;
  v_trib   uuid;
begin
  for r in
    with catalogo(codigo, sigla, nome) as (values
      (100, 'STF', 'Supremo Tribunal Federal'),
      (200, 'CNJ', 'Conselho Nacional de Justiça'),
      (300, 'STJ', 'Superior Tribunal de Justiça'),
      (401, 'TRF1', 'Tribunal Regional Federal da 1ª Região'),
      (402, 'TRF2', 'Tribunal Regional Federal da 2ª Região'),
      (403, 'TRF3', 'Tribunal Regional Federal da 3ª Região'),
      (404, 'TRF4', 'Tribunal Regional Federal da 4ª Região'),
      (405, 'TRF5', 'Tribunal Regional Federal da 5ª Região'),
      (406, 'TRF6', 'Tribunal Regional Federal da 6ª Região'),
      (490, 'CJF', 'Conselho da Justiça Federal'),
      (500, 'TST', 'Tribunal Superior do Trabalho'),
      (501, 'TRT1', 'Tribunal Regional do Trabalho da 1ª Região (RJ)'),
      (502, 'TRT2', 'Tribunal Regional do Trabalho da 2ª Região (SP capital)'),
      (503, 'TRT3', 'Tribunal Regional do Trabalho da 3ª Região (MG)'),
      (504, 'TRT4', 'Tribunal Regional do Trabalho da 4ª Região (RS)'),
      (505, 'TRT5', 'Tribunal Regional do Trabalho da 5ª Região (BA)'),
      (506, 'TRT6', 'Tribunal Regional do Trabalho da 6ª Região (PE)'),
      (507, 'TRT7', 'Tribunal Regional do Trabalho da 7ª Região (CE)'),
      (508, 'TRT8', 'Tribunal Regional do Trabalho da 8ª Região (PA/AP)'),
      (509, 'TRT9', 'Tribunal Regional do Trabalho da 9ª Região (PR)'),
      (510, 'TRT10', 'Tribunal Regional do Trabalho da 10ª Região (DF/TO)'),
      (511, 'TRT11', 'Tribunal Regional do Trabalho da 11ª Região (AM/RR)'),
      (512, 'TRT12', 'Tribunal Regional do Trabalho da 12ª Região (SC)'),
      (513, 'TRT13', 'Tribunal Regional do Trabalho da 13ª Região (PB)'),
      (514, 'TRT14', 'Tribunal Regional do Trabalho da 14ª Região (RO/AC)'),
      (515, 'TRT15', 'Tribunal Regional do Trabalho da 15ª Região (SP Campinas)'),
      (516, 'TRT16', 'Tribunal Regional do Trabalho da 16ª Região (MA)'),
      (517, 'TRT17', 'Tribunal Regional do Trabalho da 17ª Região (ES)'),
      (518, 'TRT18', 'Tribunal Regional do Trabalho da 18ª Região (GO)'),
      (519, 'TRT19', 'Tribunal Regional do Trabalho da 19ª Região (AL)'),
      (520, 'TRT20', 'Tribunal Regional do Trabalho da 20ª Região (SE)'),
      (521, 'TRT21', 'Tribunal Regional do Trabalho da 21ª Região (RN)'),
      (522, 'TRT22', 'Tribunal Regional do Trabalho da 22ª Região (PI)'),
      (523, 'TRT23', 'Tribunal Regional do Trabalho da 23ª Região (MT)'),
      (524, 'TRT24', 'Tribunal Regional do Trabalho da 24ª Região (MS)'),
      (600, 'TSE', 'Tribunal Superior Eleitoral'),
      (601, 'TRE-AC', 'Tribunal Regional Eleitoral do Acre'),
      (602, 'TRE-AL', 'Tribunal Regional Eleitoral de Alagoas'),
      (603, 'TRE-AP', 'Tribunal Regional Eleitoral do Amapá'),
      (604, 'TRE-AM', 'Tribunal Regional Eleitoral do Amazonas'),
      (605, 'TRE-BA', 'Tribunal Regional Eleitoral da Bahia'),
      (606, 'TRE-CE', 'Tribunal Regional Eleitoral do Ceará'),
      (607, 'TRE-DF', 'Tribunal Regional Eleitoral do Distrito Federal'),
      (608, 'TRE-ES', 'Tribunal Regional Eleitoral do Espírito Santo'),
      (609, 'TRE-GO', 'Tribunal Regional Eleitoral de Goiás'),
      (610, 'TRE-MA', 'Tribunal Regional Eleitoral do Maranhão'),
      (611, 'TRE-MT', 'Tribunal Regional Eleitoral de Mato Grosso'),
      (612, 'TRE-MS', 'Tribunal Regional Eleitoral de Mato Grosso do Sul'),
      (613, 'TRE-MG', 'Tribunal Regional Eleitoral de Minas Gerais'),
      (614, 'TRE-PA', 'Tribunal Regional Eleitoral do Pará'),
      (615, 'TRE-PB', 'Tribunal Regional Eleitoral da Paraíba'),
      (616, 'TRE-PR', 'Tribunal Regional Eleitoral do Paraná'),
      (617, 'TRE-PE', 'Tribunal Regional Eleitoral de Pernambuco'),
      (618, 'TRE-PI', 'Tribunal Regional Eleitoral do Piauí'),
      (619, 'TRE-RJ', 'Tribunal Regional Eleitoral do Rio de Janeiro'),
      (620, 'TRE-RN', 'Tribunal Regional Eleitoral do Rio Grande do Norte'),
      (621, 'TRE-RS', 'Tribunal Regional Eleitoral do Rio Grande do Sul'),
      (622, 'TRE-RO', 'Tribunal Regional Eleitoral de Rondônia'),
      (623, 'TRE-RR', 'Tribunal Regional Eleitoral de Roraima'),
      (624, 'TRE-SC', 'Tribunal Regional Eleitoral de Santa Catarina'),
      (625, 'TRE-SE', 'Tribunal Regional Eleitoral de Sergipe'),
      (626, 'TRE-SP', 'Tribunal Regional Eleitoral de São Paulo'),
      (627, 'TRE-TO', 'Tribunal Regional Eleitoral do Tocantins'),
      (700, 'STM', 'Superior Tribunal Militar'),
      (801, 'TJAC', 'Tribunal de Justiça do Acre'),
      (802, 'TJAL', 'Tribunal de Justiça de Alagoas'),
      (803, 'TJAP', 'Tribunal de Justiça do Amapá'),
      (804, 'TJAM', 'Tribunal de Justiça do Amazonas'),
      (805, 'TJBA', 'Tribunal de Justiça da Bahia'),
      (806, 'TJCE', 'Tribunal de Justiça do Ceará'),
      (807, 'TJDFT', 'Tribunal de Justiça do Distrito Federal e dos Territórios'),
      (808, 'TJES', 'Tribunal de Justiça do Espírito Santo'),
      (809, 'TJGO', 'Tribunal de Justiça de Goiás'),
      (810, 'TJMA', 'Tribunal de Justiça do Maranhão'),
      (811, 'TJMT', 'Tribunal de Justiça de Mato Grosso'),
      (812, 'TJMS', 'Tribunal de Justiça de Mato Grosso do Sul'),
      (813, 'TJMG', 'Tribunal de Justiça de Minas Gerais'),
      (814, 'TJPA', 'Tribunal de Justiça do Pará'),
      (815, 'TJPB', 'Tribunal de Justiça da Paraíba'),
      (816, 'TJPR', 'Tribunal de Justiça do Paraná'),
      (817, 'TJPE', 'Tribunal de Justiça de Pernambuco'),
      (818, 'TJPI', 'Tribunal de Justiça do Piauí'),
      (819, 'TJRJ', 'Tribunal de Justiça do Rio de Janeiro'),
      (820, 'TJRN', 'Tribunal de Justiça do Rio Grande do Norte'),
      (821, 'TJRS', 'Tribunal de Justiça do Rio Grande do Sul'),
      (822, 'TJRO', 'Tribunal de Justiça de Rondônia'),
      (823, 'TJRR', 'Tribunal de Justiça de Roraima'),
      (824, 'TJSC', 'Tribunal de Justiça de Santa Catarina'),
      (825, 'TJSE', 'Tribunal de Justiça de Sergipe'),
      (826, 'TJSP', 'Tribunal de Justiça de São Paulo'),
      (827, 'TJTO', 'Tribunal de Justiça do Tocantins'),
      (913, 'TJM-MG', 'Tribunal de Justiça Militar de Minas Gerais'),
      (921, 'TJM-RS', 'Tribunal de Justiça Militar do Rio Grande do Sul'),
      (926, 'TJM-SP', 'Tribunal de Justiça Militar de São Paulo')
    )
    select distinct pj.escritorio_id,
           (pj.cnj_segmento * 100 + pj.cnj_tribunal) as codigo,
           c.sigla, c.nome
    from processo_judicial pj
    join catalogo c on c.codigo = pj.cnj_segmento * 100 + pj.cnj_tribunal
    where pj.deletado_em is null
      and pj.cnj_segmento is not null
      and pj.cnj_tribunal is not null
  loop
    -- acha ou cria o tribunal do escritório para esse código
    select id into v_trib from tribunal
     where escritorio_id = r.escritorio_id and codigo_cnj = r.codigo
       and deletado_em is null;
    if v_trib is null then
      insert into tribunal (escritorio_id, nome, sigla, codigo_cnj)
        values (r.escritorio_id, r.nome, r.sigla, r.codigo)
        returning id into v_trib;
    end if;

    -- liga os processos daquele tribunal que ainda estão sem vínculo
    update processo_judicial pj
       set tribunal_id = v_trib
     where pj.escritorio_id = r.escritorio_id
       and pj.cnj_segmento * 100 + pj.cnj_tribunal = r.codigo
       and pj.tribunal_id is null
       and pj.deletado_em is null;
  end loop;
end;
$$;
