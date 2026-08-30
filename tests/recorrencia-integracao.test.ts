// Integração da Etapa 3a contra o Supabase real (não há Docker local).
//
// Valida o que os testes de unidade + o build NÃO cobrem: a migration
// `20260830150000_recorrencia.sql` — colunas, CHECKs, FK, índice único — e o
// ida-e-volta entre `colunasDaRegra` / `regraDaLinha` e as colunas de verdade.
//
// Tudo roda dentro de uma transação com ROLLBACK no fim: não deixa lixo.
// Conecta como `postgres` pelo Session pooler (ignora a RLS de propósito).
//
// Pré-requisito: variável DATABASE_URL. Sem ela, os testes são pulados.
//   DATABASE_URL="postgresql://postgres.<ref>:<senha>@aws-0-sa-east-1.pooler.supabase.com:5432/postgres" npm test

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client, types } from "pg";

// O driver `pg` devolve `date` como Date; o cliente Supabase (PostgREST/JSON)
// devolve string 'AAAA-MM-DD'. Igualamos ao comportamento de produção.
types.setTypeParser(1082, (v) => v); // 1082 = OID de `date`
import {
  colunasDaRegra,
  regraDaLinha,
} from "@/lib/db/recorrencias";
import type { RegraRecorrencia } from "@/lib/domain/recorrencia";

const URL = process.env.DATABASE_URL;
const suite = URL ? describe : describe.skip;

suite("Etapa 3a — integração com o Supabase real", () => {
  let cli: Client;
  // contexto emprestado de dados que já existem no banco
  let escritorioId: string;
  let processoId: string;
  let tipoAtividadeId: string;
  let membroId: string | null;

  beforeAll(async () => {
    cli = new Client({ connectionString: URL });
    await cli.connect();

    const ctx = await cli.query(`
      select p.escritorio_id, p.id as processo_id
      from processo p
      where p.tipo = 'geral' and p.deletado_em is null
      limit 1
    `);
    if (ctx.rowCount === 0) throw new Error("Sem processo 'geral' no banco para o teste.");
    escritorioId = ctx.rows[0].escritorio_id;
    processoId = ctx.rows[0].processo_id;

    const ta = await cli.query(
      `select id from tipo_atividade
       where escritorio_id = $1 and aplica_a = 'compromisso' and deletado_em is null
       limit 1`,
      [escritorioId],
    );
    if (ta.rowCount === 0) throw new Error("Sem tipo_atividade 'compromisso'.");
    tipoAtividadeId = ta.rows[0].id;

    const m = await cli.query(
      `select id from membro where escritorio_id = $1 limit 1`,
      [escritorioId],
    );
    membroId = m.rowCount ? m.rows[0].id : null;
  });

  afterAll(async () => {
    if (cli) await cli.end();
  });

  // Cada teste roda numa transação isolada e desfeita.
  async function comRollback(fn: () => Promise<void>) {
    await cli.query("begin");
    try {
      await fn();
    } finally {
      await cli.query("rollback");
    }
  }

  function inserirRecorrencia(regra: RegraRecorrencia, extra: Record<string, unknown> = {}) {
    const cols = {
      escritorio_id: escritorioId,
      atividade_tipo: "compromisso",
      processo_id: processoId,
      tipo_atividade_id: tipoAtividadeId,
      titulo: "TESTE integração recorrência",
      responsavel_id: membroId,
      prioridade_manual: "media",
      ...colunasDaRegra(regra),
      ...extra,
    };
    const nomes = Object.keys(cols);
    const valores = Object.values(cols);
    const marcadores = nomes.map((_, i) => `$${i + 1}`).join(", ");
    return cli.query(
      `insert into atividade_recorrencia (${nomes.join(", ")})
       values (${marcadores}) returning *`,
      valores,
    );
  }

  it("a tabela atividade_recorrencia existe com as colunas da migration", async () => {
    const { rows } = await cli.query(`
      select column_name from information_schema.columns
      where table_name = 'atividade_recorrencia'
    `);
    const colunas = rows.map((r) => r.column_name);
    for (const c of [
      "id", "escritorio_id", "atividade_tipo", "processo_id", "titulo",
      "data_base", "periodicidade_tipo", "intervalo_cada", "intervalo_unidade",
      "dias_da_semana", "dia_do_mes", "termino_tipo", "termino_ate",
      "termino_ocorrencias", "ativa", "hora", "local", "alvo", "deletado_em",
    ]) {
      expect(colunas).toContain(c);
    }
  });

  it("a FK atividade.recorrencia_id e o índice único existem", async () => {
    const fk = await cli.query(`
      select 1 from pg_constraint
      where conname = 'atividade_recorrencia_fk' and confdeltype = 'n'
    `); // 'n' = ON DELETE SET NULL
    expect(fk.rowCount).toBe(1);

    const idx = await cli.query(`
      select 1 from pg_indexes
      where indexname = 'atividade_recorrencia_data_unica'
    `);
    expect(idx.rowCount).toBe(1);
  });

  it("aceita uma regra intervalo e faz o ida-e-volta com regraDaLinha", async () => {
    await comRollback(async () => {
      const regra: RegraRecorrencia = {
        dataBase: "2026-09-01",
        periodicidade: { tipo: "intervalo", cada: 2, unidade: "semanas" },
        termino: { tipo: "ocorrencias", total: 5 },
      };
      const { rows } = await inserirRecorrencia(regra);
      expect(rows[0].periodicidade_tipo).toBe("intervalo");
      expect(regraDaLinha(rows[0])).toEqual(regra);
    });
  });

  it("aceita uma regra semanal (int[]) e reconstrói os dias", async () => {
    await comRollback(async () => {
      const regra: RegraRecorrencia = {
        dataBase: "2026-09-01",
        periodicidade: { tipo: "semanal", diasDaSemana: [1, 3, 5] },
        termino: { tipo: "indefinido" },
      };
      const { rows } = await inserirRecorrencia(regra);
      expect(regraDaLinha(rows[0])).toEqual(regra);
    });
  });

  it("aceita uma regra mensal com término por data", async () => {
    await comRollback(async () => {
      const regra: RegraRecorrencia = {
        dataBase: "2026-09-10",
        periodicidade: { tipo: "mensal", diaDoMes: 10 },
        termino: { tipo: "data", ate: "2026-12-31" },
      };
      const { rows } = await inserirRecorrencia(regra);
      expect(regraDaLinha(rows[0])).toEqual(regra);
    });
  });

  it("o CHECK barra 'semanal' sem dias_da_semana", async () => {
    await comRollback(async () => {
      await expect(
        cli.query(
          `insert into atividade_recorrencia
           (escritorio_id, atividade_tipo, processo_id, titulo, data_base,
            periodicidade_tipo, termino_tipo)
           values ($1,'compromisso',$2,'x','2026-09-01','semanal','indefinido')`,
          [escritorioId, processoId],
        ),
      ).rejects.toThrow();
    });
  });

  it("o CHECK barra término 'data' sem termino_ate", async () => {
    await comRollback(async () => {
      await expect(
        cli.query(
          `insert into atividade_recorrencia
           (escritorio_id, atividade_tipo, processo_id, titulo, data_base,
            periodicidade_tipo, intervalo_cada, intervalo_unidade, termino_tipo)
           values ($1,'compromisso',$2,'x','2026-09-01','intervalo',1,'semanas','data')`,
          [escritorioId, processoId],
        ),
      ).rejects.toThrow();
    });
  });

  it("o índice único bloqueia duas instâncias na mesma data da mesma série", async () => {
    await comRollback(async () => {
      const regra: RegraRecorrencia = {
        dataBase: "2026-09-01",
        periodicidade: { tipo: "intervalo", cada: 1, unidade: "semanas" },
        termino: { tipo: "indefinido" },
      };
      const rec = await inserirRecorrencia(regra);
      const recId = rec.rows[0].id;

      const insereInstancia = () =>
        cli.query(
          `insert into atividade
           (escritorio_id, processo_id, tipo, titulo, data, status,
            recorrencia_id, e_instancia_recorrente)
           values ($1,$2,'compromisso','inst','2026-09-01','pendente',$3,true)`,
          [escritorioId, processoId, recId],
        );

      await insereInstancia();
      await expect(insereInstancia()).rejects.toMatchObject({ code: "23505" });
    });
  });

  it("apagar a série põe atividade.recorrencia_id em NULL (ON DELETE SET NULL)", async () => {
    await comRollback(async () => {
      const regra: RegraRecorrencia = {
        dataBase: "2026-09-01",
        periodicidade: { tipo: "intervalo", cada: 1, unidade: "semanas" },
        termino: { tipo: "indefinido" },
      };
      const rec = await inserirRecorrencia(regra);
      const recId = rec.rows[0].id;

      const inst = await cli.query(
        `insert into atividade
         (escritorio_id, processo_id, tipo, titulo, data, status,
          recorrencia_id, e_instancia_recorrente)
         values ($1,$2,'compromisso','inst','2026-09-08','pendente',$3,true)
         returning id`,
        [escritorioId, processoId, recId],
      );
      const instId = inst.rows[0].id;

      await cli.query(`delete from atividade_recorrencia where id = $1`, [recId]);

      const depois = await cli.query(
        `select recorrencia_id from atividade where id = $1`,
        [instId],
      );
      expect(depois.rows[0].recorrencia_id).toBeNull();
    });
  });
});
