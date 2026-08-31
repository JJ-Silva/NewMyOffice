// Integração da Etapa 5 contra o Supabase real. Valida a migration
// `20260830160000_djen_publicacao.sql`. Transação com rollback, conexão como
// `postgres` (ignora RLS). Pulado sem DATABASE_URL. Ver tests/README.md.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client, types } from "pg";

types.setTypeParser(1082, (v) => v); // date como string

const URL = process.env.DATABASE_URL;
const suite = URL ? describe : describe.skip;

suite("Etapa 5 — integração (DJEN / publicação)", () => {
  let cli: Client;
  let escritorioId: string;

  beforeAll(async () => {
    cli = new Client({ connectionString: URL });
    await cli.connect();
    const r = await cli.query(
      `select id from escritorio where deletado_em is null limit 1`,
    );
    if (r.rowCount === 0) throw new Error("Sem escritório no banco.");
    escritorioId = r.rows[0].id;
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

  it("as tabelas oab_monitorada e publicacao existem com as colunas certas", async () => {
    const cols = async (tabela: string) =>
      (
        await cli.query(
          `select column_name from information_schema.columns where table_name = $1`,
          [tabela],
        )
      ).rows.map((r) => r.column_name);

    const oab = await cols("oab_monitorada");
    for (const c of ["escritorio_id", "numero", "uf", "nome_advogado", "ativo", "deletado_em"]) {
      expect(oab).toContain(c);
    }
    const pub = await cols("publicacao");
    for (const c of [
      "escritorio_id", "djen_id", "hash", "data_disponibilizacao",
      "sigla_tribunal", "nome_orgao", "tipo_comunicacao", "nome_classe",
      "numero_processo", "cnj", "texto", "texto_original", "status",
      "processo_id", "atividade_id", "motivo_descarte", "deletado_em",
    ]) {
      expect(pub).toContain(c);
    }
  });

  it("dedupe: duas publicações com o mesmo djen_id no mesmo escritório são bloqueadas", async () => {
    await comRollback(async () => {
      const insere = () =>
        cli.query(
          `insert into publicacao
           (escritorio_id, djen_id, data_disponibilizacao, texto, status)
           values ($1, 999000111, '2026-08-20', 'x', 'nova')`,
          [escritorioId],
        );
      await insere();
      await expect(insere()).rejects.toMatchObject({ code: "23505" });
    });
  });

  it("o CHECK de status barra um valor fora de nova/descartada/virou_prazo", async () => {
    await comRollback(async () => {
      await expect(
        cli.query(
          `insert into publicacao
           (escritorio_id, djen_id, data_disponibilizacao, texto, status)
           values ($1, 999000222, '2026-08-20', 'x', 'qualquer')`,
          [escritorioId],
        ),
      ).rejects.toThrow();
    });
  });

  it("oab_monitorada: mesma OAB duas vezes no escritório é bloqueada (índice parcial)", async () => {
    await comRollback(async () => {
      // número aleatório para não colidir com OABs reais já cadastradas
      const numero = String(900000 + Math.floor(Math.random() * 99999));
      const insere = () =>
        cli.query(
          `insert into oab_monitorada (escritorio_id, numero, uf)
           values ($1, $2, 'ZZ')`,
          [escritorioId, numero],
        );
      await insere();
      await expect(insere()).rejects.toMatchObject({ code: "23505" });
    });
  });
});
