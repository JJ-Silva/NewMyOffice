// Integração da feature Tramitação contra o Supabase real. Valida a migration
// `20260906120000_andamento.sql` — colunas, CHECK de `origem`, FKs, índice,
// RLS — e o backfill de permissões. Transação com rollback, conexão como
// `postgres` (ignora RLS). Pulado sem DATABASE_URL. Ver tests/README.md.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client, types } from "pg";

types.setTypeParser(1082, (v) => v); // date como string

const URL = process.env.DATABASE_URL;
const suite = URL ? describe : describe.skip;

suite("Tramitação — integração (andamento)", () => {
  let cli: Client;
  let escritorioId: string;
  let processoId: string;
  let pastaId: string | null;
  let membroId: string | null;
  // um 2º processo, de OUTRA pasta (para o teste de agregação por pasta)
  let processoOutraPasta: string | null;
  let outraPastaId: string | null;

  beforeAll(async () => {
    cli = new Client({ connectionString: URL });
    await cli.connect();

    const ctx = await cli.query(`
      select p.escritorio_id, p.id as processo_id, p.pasta_id
      from processo p
      where p.tipo = 'geral' and p.deletado_em is null
      limit 1
    `);
    if (ctx.rowCount === 0) throw new Error("Sem processo 'geral' no banco.");
    escritorioId = ctx.rows[0].escritorio_id;
    processoId = ctx.rows[0].processo_id;
    pastaId = ctx.rows[0].pasta_id;

    const m = await cli.query(
      `select id from membro where escritorio_id = $1 limit 1`,
      [escritorioId],
    );
    membroId = m.rowCount ? m.rows[0].id : null;

    const outro = await cli.query(
      `select p.id, p.pasta_id from processo p
       where p.escritorio_id = $1 and p.pasta_id is not null
         and p.pasta_id <> $2 and p.deletado_em is null
       limit 1`,
      [escritorioId, pastaId],
    );
    if (outro.rowCount) {
      processoOutraPasta = outro.rows[0].id;
      outraPastaId = outro.rows[0].pasta_id;
    }
  });

  afterAll(async () => {
    if (cli) await cli.end();
  });

  async function comRollback(fn: () => Promise<void>) {
    await cli.query("begin");
    try {
      await fn();
    } finally {
      await cli.query("rollback");
    }
  }

  function inserir(extra: Record<string, unknown> = {}) {
    const cols: Record<string, unknown> = {
      escritorio_id: escritorioId,
      processo_id: processoId,
      autor_membro_id: membroId,
      origem: "manual",
      texto: "TESTE integração tramitação",
      ...extra,
    };
    const nomes = Object.keys(cols);
    const marcadores = nomes.map((_, i) => `$${i + 1}`).join(", ");
    return cli.query(
      `insert into andamento (${nomes.join(", ")})
       values (${marcadores}) returning *`,
      Object.values(cols),
    );
  }

  it("a tabela andamento existe com as colunas da migration", async () => {
    const { rows } = await cli.query(`
      select column_name from information_schema.columns
      where table_name = 'andamento'
    `);
    const colunas = rows.map((r) => r.column_name);
    for (const c of [
      "id", "escritorio_id", "processo_id", "autor_membro_id", "origem",
      "atividade_id", "publicacao_id", "texto", "criado_em", "deletado_em",
    ]) {
      expect(colunas).toContain(c);
    }
  });

  it("o índice andamento_por_processo existe", async () => {
    const idx = await cli.query(`
      select 1 from pg_indexes where indexname = 'andamento_por_processo'
    `);
    expect(idx.rowCount).toBe(1);
  });

  it("a RLS está ligada e a policy usa tem_permissao('tramitacao.ver')", async () => {
    const rls = await cli.query(`
      select relrowsecurity from pg_class where relname = 'andamento'
    `);
    expect(rls.rows[0].relrowsecurity).toBe(true);

    const pol = await cli.query(`
      select qual from pg_policies
      where tablename = 'andamento' and policyname = 'andamento_rls'
    `);
    expect(pol.rowCount).toBe(1);
    expect(pol.rows[0].qual).toContain("tramitacao.ver");
  });

  it("aceita um andamento manual com autor e faz o ida-e-volta", async () => {
    await comRollback(async () => {
      const { rows } = await inserir();
      expect(rows[0].origem).toBe("manual");
      expect(rows[0].processo_id).toBe(processoId);
      expect(rows[0].deletado_em).toBeNull();
    });
  });

  it("aceita autor_membro_id null (publicação do DJEN)", async () => {
    await comRollback(async () => {
      const { rows } = await inserir({
        autor_membro_id: null,
        origem: "publicacao_djen",
      });
      expect(rows[0].autor_membro_id).toBeNull();
    });
  });

  it("o CHECK barra uma origem fora da lista", async () => {
    await comRollback(async () => {
      await expect(inserir({ origem: "qualquer_coisa" })).rejects.toThrow();
    });
  });

  it("processo_id é obrigatório (not null)", async () => {
    await comRollback(async () => {
      await expect(inserir({ processo_id: null })).rejects.toMatchObject({
        code: "23502",
      });
    });
  });

  it("apagar a atividade põe andamento.atividade_id em NULL (ON DELETE SET NULL)", async () => {
    await comRollback(async () => {
      const at = await cli.query(
        `insert into atividade
           (escritorio_id, processo_id, tipo, titulo, data, status)
         values ($1, $2, 'compromisso', 'inst', '2026-09-10', 'pendente')
         returning id`,
        [escritorioId, processoId],
      );
      const atividadeId = at.rows[0].id;
      const and = await inserir({
        atividade_id: atividadeId,
        origem: "criacao_atividade",
      });
      await cli.query(`delete from atividade where id = $1`, [atividadeId]);
      const depois = await cli.query(
        `select atividade_id from andamento where id = $1`,
        [and.rows[0].id],
      );
      expect(depois.rows[0].atividade_id).toBeNull();
    });
  });

  // Espelha o que listarAndamentosDaPasta faz via PostgREST
  // (processo:processo_id!inner + .eq("processo.pasta_id", …)): a agregação por
  // pasta tem de somar SÓ os andamentos dos processos daquela pasta.
  it("agregação por pasta junta só os andamentos dos processos da pasta", async () => {
    if (!pastaId || !processoOutraPasta || !outraPastaId) {
      return; // banco sem 2 pastas com processo — nada a comparar
    }
    await comRollback(async () => {
      const daPasta = await inserir({ texto: "andamento da pasta alvo" });
      const deOutra = await inserir({
        processo_id: processoOutraPasta,
        texto: "andamento de outra pasta",
      });

      const { rows } = await cli.query(
        `select a.id
           from andamento a
           join processo p on p.id = a.processo_id
          where a.deletado_em is null and p.pasta_id = $1`,
        [pastaId],
      );
      const ids = rows.map((r) => r.id);
      expect(ids).toContain(daPasta.rows[0].id);
      expect(ids).not.toContain(deOutra.rows[0].id);
    });
  });

  it("backfill: nenhum rótulo tem atividades.ver sem tramitacao.ver", async () => {
    const { rows } = await cli.query(`
      select rp.rotulo_id
      from rotulo_permissao rp
      where rp.permissao = 'atividades.ver'
        and not exists (
          select 1 from rotulo_permissao rp2
          where rp2.rotulo_id = rp.rotulo_id
            and rp2.permissao = 'tramitacao.ver'
        )
    `);
    expect(rows).toHaveLength(0);
  });
});
