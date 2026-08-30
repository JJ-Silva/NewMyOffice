import { describe, it, expect } from "vitest";
import {
  HORIZONTE_MATERIALIZACAO_DIAS,
  validarRegra,
  descreverRegra,
  ocorrenciasAte,
  ocorrenciasFaltantes,
  primeiraOcorrencia,
  proximaOcorrenciaApos,
  type RegraRecorrencia,
} from "./recorrencia";

// Referência de dias da semana (bate com atividade.test.ts):
//   segunda 2026-03-02 · quinta 2026-03-05 · domingo 2026-03-08

describe("validarRegra", () => {
  const base = { dataBase: "2026-03-02", termino: { tipo: "indefinido" } as const };

  it("aceita uma regra bem formada", () => {
    expect(
      validarRegra({
        ...base,
        periodicidade: { tipo: "intervalo", cada: 2, unidade: "semanas" },
      }),
    ).toEqual({ ok: true });
  });

  it("semanal sem nenhum dia marcado é inválida", () => {
    const r = validarRegra({
      ...base,
      periodicidade: { tipo: "semanal", diasDaSemana: [] },
    });
    expect(r.ok).toBe(false);
  });

  it("intervalo menor que 1 é inválido", () => {
    const r = validarRegra({
      ...base,
      periodicidade: { tipo: "intervalo", cada: 0, unidade: "dias" },
    });
    expect(r.ok).toBe(false);
  });

  it("dia do mês fora de 1..31 é inválido", () => {
    const r = validarRegra({
      ...base,
      periodicidade: { tipo: "mensal", diaDoMes: 32 },
    });
    expect(r.ok).toBe(false);
  });

  it("data-limite anterior à data-base é inválida", () => {
    const r = validarRegra({
      dataBase: "2026-03-10",
      periodicidade: { tipo: "intervalo", cada: 1, unidade: "dias" },
      termino: { tipo: "data", ate: "2026-03-01" },
    });
    expect(r.ok).toBe(false);
  });

  it("número de ocorrências menor que 1 é inválido", () => {
    const r = validarRegra({
      ...base,
      periodicidade: { tipo: "intervalo", cada: 1, unidade: "dias" },
      termino: { tipo: "ocorrencias", total: 0 },
    });
    expect(r.ok).toBe(false);
  });
});

describe("descreverRegra", () => {
  it("intervalo de 1 unidade vira 'Toda semana'", () => {
    expect(
      descreverRegra({
        dataBase: "2026-03-02",
        periodicidade: { tipo: "intervalo", cada: 1, unidade: "semanas" },
        termino: { tipo: "indefinido" },
      }),
    ).toBe("Toda semana");
  });

  it("intervalo de N unidades", () => {
    expect(
      descreverRegra({
        dataBase: "2026-03-02",
        periodicidade: { tipo: "intervalo", cada: 3, unidade: "dias" },
        termino: { tipo: "indefinido" },
      }),
    ).toBe("A cada 3 dias");
  });

  it("semanal lista os dias em ordem e curtos", () => {
    expect(
      descreverRegra({
        dataBase: "2026-03-02",
        periodicidade: { tipo: "semanal", diasDaSemana: [5, 1, 3] },
        termino: { tipo: "indefinido" },
      }),
    ).toBe("Toda semana: seg, qua, sex");
  });

  it("mensal por dia", () => {
    expect(
      descreverRegra({
        dataBase: "2026-03-10",
        periodicidade: { tipo: "mensal", diaDoMes: 10 },
        termino: { tipo: "data", ate: "2026-12-31" },
      }),
    ).toBe("Todo dia 10 do mês · até 31/12/2026");
  });

  it("acrescenta o término por número de vezes", () => {
    expect(
      descreverRegra({
        dataBase: "2026-03-02",
        periodicidade: { tipo: "intervalo", cada: 2, unidade: "semanas" },
        termino: { tipo: "ocorrencias", total: 3 },
      }),
    ).toBe("A cada 2 semanas · 3 vezes");
  });
});

describe("ocorrenciasAte — intervalo", () => {
  it("a cada 3 dias", () => {
    const r: RegraRecorrencia = {
      dataBase: "2026-03-02",
      periodicidade: { tipo: "intervalo", cada: 3, unidade: "dias" },
      termino: { tipo: "indefinido" },
    };
    expect(ocorrenciasAte(r, "2026-03-15")).toEqual([
      "2026-03-02",
      "2026-03-05",
      "2026-03-08",
      "2026-03-11",
      "2026-03-14",
    ]);
  });

  it("a cada 2 semanas", () => {
    const r: RegraRecorrencia = {
      dataBase: "2026-03-02",
      periodicidade: { tipo: "intervalo", cada: 2, unidade: "semanas" },
      termino: { tipo: "indefinido" },
    };
    expect(ocorrenciasAte(r, "2026-04-15")).toEqual([
      "2026-03-02",
      "2026-03-16",
      "2026-03-30",
      "2026-04-13",
    ]);
  });

  it("a cada 1 mês cai no último dia quando o dia 31 não existe", () => {
    const r: RegraRecorrencia = {
      dataBase: "2026-01-31",
      periodicidade: { tipo: "intervalo", cada: 1, unidade: "meses" },
      termino: { tipo: "ocorrencias", total: 4 },
    };
    expect(ocorrenciasAte(r, "2026-12-31")).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
      "2026-04-30",
    ]);
  });

  it("o término por data corta a lista (inclusive)", () => {
    const r: RegraRecorrencia = {
      dataBase: "2026-03-02",
      periodicidade: { tipo: "intervalo", cada: 7, unidade: "dias" },
      termino: { tipo: "data", ate: "2026-03-16" },
    };
    expect(ocorrenciasAte(r, "2026-12-31")).toEqual([
      "2026-03-02",
      "2026-03-09",
      "2026-03-16",
    ]);
  });
});

describe("ocorrenciasAte — semanal", () => {
  it("segundas e quintas", () => {
    const r: RegraRecorrencia = {
      dataBase: "2026-03-02", // segunda
      periodicidade: { tipo: "semanal", diasDaSemana: [1, 4] },
      termino: { tipo: "indefinido" },
    };
    expect(ocorrenciasAte(r, "2026-03-16")).toEqual([
      "2026-03-02",
      "2026-03-05",
      "2026-03-09",
      "2026-03-12",
      "2026-03-16",
    ]);
  });

  it("quando a data-base não cai num dia marcado, começa no próximo marcado", () => {
    const r: RegraRecorrencia = {
      dataBase: "2026-03-04", // quarta
      periodicidade: { tipo: "semanal", diasDaSemana: [1] }, // só segunda
      termino: { tipo: "indefinido" },
    };
    expect(ocorrenciasAte(r, "2026-03-23")).toEqual([
      "2026-03-09",
      "2026-03-16",
      "2026-03-23",
    ]);
  });
});

describe("ocorrenciasAte — mensal", () => {
  it("todo dia 10 até junho", () => {
    const r: RegraRecorrencia = {
      dataBase: "2026-03-10",
      periodicidade: { tipo: "mensal", diaDoMes: 10 },
      termino: { tipo: "data", ate: "2026-06-30" },
    };
    expect(ocorrenciasAte(r, "2026-12-31")).toEqual([
      "2026-03-10",
      "2026-04-10",
      "2026-05-10",
      "2026-06-10",
    ]);
  });

  it("se a data-base já passou do dia do mês, a 1ª ocorrência é no mês seguinte", () => {
    const r: RegraRecorrencia = {
      dataBase: "2026-03-15",
      periodicidade: { tipo: "mensal", diaDoMes: 10 },
      termino: { tipo: "ocorrencias", total: 2 },
    };
    expect(ocorrenciasAte(r, "2026-12-31")).toEqual([
      "2026-04-10",
      "2026-05-10",
    ]);
  });
});

describe("primeiraOcorrencia", () => {
  it("intervalo: é a própria data-base", () => {
    expect(
      primeiraOcorrencia({
        dataBase: "2026-03-02",
        periodicidade: { tipo: "intervalo", cada: 5, unidade: "dias" },
        termino: { tipo: "indefinido" },
      }),
    ).toBe("2026-03-02");
  });

  it("semanal: é o primeiro dia marcado a partir da data-base", () => {
    expect(
      primeiraOcorrencia({
        dataBase: "2026-03-04", // quarta
        periodicidade: { tipo: "semanal", diasDaSemana: [1] }, // segunda
        termino: { tipo: "indefinido" },
      }),
    ).toBe("2026-03-09");
  });
});

describe("proximaOcorrenciaApos", () => {
  const semanal7: RegraRecorrencia = {
    dataBase: "2026-03-02",
    periodicidade: { tipo: "intervalo", cada: 7, unidade: "dias" },
    termino: { tipo: "indefinido" },
  };

  it("devolve a ocorrência seguinte", () => {
    expect(proximaOcorrenciaApos(semanal7, "2026-03-09")).toBe("2026-03-16");
  });

  it("respeita o término por número de ocorrências", () => {
    const r: RegraRecorrencia = {
      dataBase: "2026-01-10",
      periodicidade: { tipo: "mensal", diaDoMes: 10 },
      termino: { tipo: "ocorrencias", total: 3 }, // jan, fev, mar
    };
    expect(proximaOcorrenciaApos(r, "2026-02-10")).toBe("2026-03-10");
    expect(proximaOcorrenciaApos(r, "2026-03-10")).toBeNull();
  });
});

describe("ocorrenciasFaltantes", () => {
  const r: RegraRecorrencia = {
    dataBase: "2026-03-02",
    periodicidade: { tipo: "intervalo", cada: 7, unidade: "dias" },
    termino: { tipo: "indefinido" },
  };

  it("devolve só o que ainda não existe", () => {
    expect(
      ocorrenciasFaltantes(r, ["2026-03-02", "2026-03-09"], "2026-03-30"),
    ).toEqual(["2026-03-16", "2026-03-23", "2026-03-30"]);
  });

  it("uma ocorrência já existente (mesmo que apagada) não volta", () => {
    // 2026-03-16 consta como já existente → não é recriada.
    expect(
      ocorrenciasFaltantes(r, ["2026-03-02", "2026-03-16"], "2026-03-30"),
    ).toEqual(["2026-03-09", "2026-03-23", "2026-03-30"]);
  });
});

describe("horizonte", () => {
  it("materializa 90 dias à frente por padrão", () => {
    expect(HORIZONTE_MATERIALIZACAO_DIAS).toBe(90);
  });
});
