import { describe, it, expect } from "vitest";
import {
  semanasDoMes,
  semanaDe,
  mesAnterior,
  mesSeguinte,
  ehDoMes,
} from "./grade-calendario";

// Referência: 2026-02-01 é domingo · 2026-03-01 é domingo · 2026-04-01 é quarta.

describe("semanasDoMes", () => {
  it("fevereiro/2026 começa no domingo e tem exatamente 4 semanas", () => {
    const semanas = semanasDoMes("2026-02");
    expect(semanas).toHaveLength(4);
    expect(semanas[0][0]).toBe("2026-02-01");
    expect(semanas[0]).toHaveLength(7);
    expect(semanas[3][6]).toBe("2026-02-28");
  });

  it("abril/2026 traz os dias de março que completam a 1ª semana", () => {
    const semanas = semanasDoMes("2026-04");
    // 01/04 é quarta → a semana começa no domingo 29/03
    expect(semanas[0][0]).toBe("2026-03-29");
    expect(semanas[0][3]).toBe("2026-04-01");
  });

  it("toda semana tem 7 dias e são consecutivos", () => {
    for (const semana of semanasDoMes("2026-04")) {
      expect(semana).toHaveLength(7);
      for (let i = 1; i < 7; i++) {
        const anterior = new Date(semana[i - 1] + "T00:00:00Z").getTime();
        const atual = new Date(semana[i] + "T00:00:00Z").getTime();
        expect(atual - anterior).toBe(86_400_000);
      }
    }
  });
});

describe("semanaDe", () => {
  it("devolve domingo→sábado da semana que contém o dia", () => {
    // 2026-03-04 é quarta → domingo 01/03, sábado 07/03
    expect(semanaDe("2026-03-04")).toEqual([
      "2026-03-01",
      "2026-03-02",
      "2026-03-03",
      "2026-03-04",
      "2026-03-05",
      "2026-03-06",
      "2026-03-07",
    ]);
  });

  it("num domingo, ele mesmo é o primeiro dia", () => {
    expect(semanaDe("2026-03-01")[0]).toBe("2026-03-01");
  });
});

describe("navegação de mês", () => {
  it("mês anterior e seguinte", () => {
    expect(mesAnterior("2026-03")).toBe("2026-02");
    expect(mesSeguinte("2026-03")).toBe("2026-04");
  });

  it("vira o ano", () => {
    expect(mesAnterior("2026-01")).toBe("2025-12");
    expect(mesSeguinte("2026-12")).toBe("2027-01");
  });
});

describe("ehDoMes", () => {
  it("distingue dias do mês de referência dos de fora", () => {
    expect(ehDoMes("2026-04-01", "2026-04")).toBe(true);
    expect(ehDoMes("2026-03-31", "2026-04")).toBe(false);
  });
});
