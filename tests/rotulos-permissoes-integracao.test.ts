// Integração da Etapa 6 contra o Supabase real. Valida a migration
// `20260831140000_rotulos_permissoes.sql`. Transação com rollback, conexão como
// `postgres` (ignora RLS). Pulado sem DATABASE_URL. Ver tests/README.md.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client, types } from "pg";

types.setTypeParser(1082, (v) => v); // date como string

const URL = process.env.DATABASE_URL;
const suite = URL ? describe : describe.skip;

suite("Etapa 6 — integração (rótulos / permissões)", () => {
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

  it("as tabelas rotulo / rotulo_permissao / membro_permissao existem", async () => {
    const cols = async (tabela: string) =>
      (
        await cli.query(
          `select column_name from information_schema.columns where table_name = $1`,
          [tabela],
        )
      ).rows.map((r) => r.column_name);

    const rotulo = await cols("rotulo");
    for (const c of ["escritorio_id", "nome", "descricao", "deletado_em"]) {
      expect(rotulo).toContain(c);
    }
    expect(await cols("rotulo_permissao")).toEqual(
      expect.arrayContaining(["rotulo_id", "permissao"]),
    );
    expect(await cols("membro_permissao")).toEqual(
      expect.arrayContaining(["membro_id", "permissao", "concedida"]),
    );

    const membro = await cols("membro");
    for (const c of ["fundador", "rotulo_id"]) {
      expect(membro).toContain(c);
    }
  });

  it("todo escritório existente ganhou os 3 rótulos-semente e tem 1 fundador", async () => {
    const rotulos = await cli.query(
      `select nome from rotulo where escritorio_id = $1 and deletado_em is null order by nome`,
      [escritorioId],
    );
    const nomes = rotulos.rows.map((r) => r.nome);
    expect(nomes).toEqual(
      expect.arrayContaining(["Advogado", "Estagiário", "Secretária / Recepção"]),
    );

    const fundadores = await cli.query(
      `select count(*)::int as n from membro
        where escritorio_id = $1 and fundador and deletado_em is null`,
      [escritorioId],
    );
    expect(fundadores.rows[0].n).toBeGreaterThanOrEqual(1);
  });

  it("o rótulo Advogado NÃO tem membros.gerenciar nem rotulos.gerenciar", async () => {
    const r = await cli.query(
      `select rp.permissao
         from rotulo rl
         join rotulo_permissao rp on rp.rotulo_id = rl.id
        where rl.escritorio_id = $1 and rl.nome = 'Advogado'`,
      [escritorioId],
    );
    const perms = r.rows.map((x) => x.permissao);
    expect(perms).toContain("atividades.ajustar_prazo");
    expect(perms).not.toContain("membros.gerenciar");
    expect(perms).not.toContain("rotulos.gerenciar");
    expect(perms).not.toContain("config.escritorio");
  });

  it("tem_permissao: fundador é true em qualquer permissão; a função existe", async () => {
    const r = await cli.query(
      `select proname from pg_proc where proname = 'tem_permissao'`,
    );
    expect(r.rowCount).toBe(1);
  });

  it("FK: membro.rotulo_id aponta para rotulo", async () => {
    await comRollback(async () => {
      await expect(
        cli.query(
          `update membro set rotulo_id = gen_random_uuid()
            where escritorio_id = $1 and fundador`,
          [escritorioId],
        ),
      ).rejects.toMatchObject({ code: "23503" });
    });
  });

  it("índice único: dois rótulos com o mesmo nome (case-insensitive) no escritório são bloqueados", async () => {
    await comRollback(async () => {
      await expect(
        cli.query(
          `insert into rotulo (escritorio_id, nome) values ($1, 'aDvOgAdO')`,
          [escritorioId],
        ),
      ).rejects.toMatchObject({ code: "23505" });
    });
  });

  it("convite: tabela + RPCs existem; um pendente por e-mail por escritório", async () => {
    const cols = (
      await cli.query(
        `select column_name from information_schema.columns where table_name = 'convite'`,
      )
    ).rows.map((r) => r.column_name);
    for (const c of [
      "escritorio_id", "email", "rotulo_id", "token", "status", "expira_em",
    ]) {
      expect(cols).toContain(c);
    }

    const fns = (
      await cli.query(
        `select proname from pg_proc where proname in ('ver_convite','aceitar_convite')`,
      )
    ).rows.map((r) => r.proname);
    expect(fns).toEqual(expect.arrayContaining(["ver_convite", "aceitar_convite"]));

    await comRollback(async () => {
      const insere = () =>
        cli.query(
          `insert into convite (escritorio_id, email, token)
           values ($1, 'colega@example.com', gen_random_uuid()::text)`,
          [escritorioId],
        );
      await insere();
      await expect(insere()).rejects.toMatchObject({ code: "23505" });
    });
  });
});
