import { describe, it, expect } from "vitest";
import {
  REGRAS_TIPO,
  atividadeVisivelEm,
  prioridadeEfetiva,
  estadoNaAgenda,
} from "./atividade";

describe("REGRAS_TIPO (plano §3.6)", () => {
  it("prazo persiste na agenda, aparece já, não recorre", () => {
    expect(REGRAS_TIPO.prazo).toEqual({
      persisteNaAgenda: true,
      diasAntesVisivelPadrao: 0,
      podeRecorrer: false,
    });
  });
  it("compromisso não persiste, aparece 5 dias antes, recorre", () => {
    expect(REGRAS_TIPO.compromisso).toEqual({
      persisteNaAgenda: false,
      diasAntesVisivelPadrao: 5,
      podeRecorrer: true,
    });
  });
  it("monitoramento não persiste, aparece no dia, recorre", () => {
    expect(REGRAS_TIPO.monitoramento).toEqual({
      persisteNaAgenda: false,
      diasAntesVisivelPadrao: 0,
      podeRecorrer: true,
    });
  });
});

describe("atividadeVisivelEm", () => {
  it("concluída ou cancelada nunca aparece", () => {
    const base = { tipo: "prazo" as const, data: "2026-03-10", diasAntesVisivelCustom: null };
    expect(atividadeVisivelEm({ ...base, status: "concluida" }, "2026-03-10")).toBe(false);
    expect(atividadeVisivelEm({ ...base, status: "cancelada" }, "2026-03-10")).toBe(false);
  });

  it("prazo pendente sempre aparece, mesmo muito antes do vencimento", () => {
    expect(
      atividadeVisivelEm(
        { tipo: "prazo", status: "pendente", data: "2026-12-31", diasAntesVisivelCustom: null },
        "2026-01-01",
      ),
    ).toBe(true);
  });

  it("compromisso aparece só na janela de 5 dias antes", () => {
    const c = { tipo: "compromisso" as const, status: "pendente" as const, data: "2026-03-10", diasAntesVisivelCustom: null };
    expect(atividadeVisivelEm(c, "2026-03-04")).toBe(false); // 6 dias antes
    expect(atividadeVisivelEm(c, "2026-03-05")).toBe(true); // 5 dias antes
    expect(atividadeVisivelEm(c, "2026-03-10")).toBe(true); // no dia
    expect(atividadeVisivelEm(c, "2026-03-11")).toBe(false); // passou
  });

  it("monitoramento aparece só no dia", () => {
    const m = { tipo: "monitoramento" as const, status: "pendente" as const, data: "2026-03-10", diasAntesVisivelCustom: null };
    expect(atividadeVisivelEm(m, "2026-03-09")).toBe(false);
    expect(atividadeVisivelEm(m, "2026-03-10")).toBe(true);
  });

  it("dias_antes_visivel_custom sobrepõe o padrão do tipo", () => {
    const m = { tipo: "monitoramento" as const, status: "pendente" as const, data: "2026-03-10", diasAntesVisivelCustom: 3 };
    expect(atividadeVisivelEm(m, "2026-03-06")).toBe(false);
    expect(atividadeVisivelEm(m, "2026-03-07")).toBe(true);
  });
});

describe("prioridadeEfetiva (4 níveis)", () => {
  const manualBaixa = { prioridadeManual: "baixa" as const };

  it("atrasada → urgente", () => {
    expect(prioridadeEfetiva({ ...manualBaixa, data: "2026-03-01" }, "2026-03-05")).toBe("urgente");
  });
  it("vence hoje → urgente", () => {
    expect(prioridadeEfetiva({ ...manualBaixa, data: "2026-03-05" }, "2026-03-05")).toBe("urgente");
  });
  it("vence amanhã → urgente", () => {
    expect(prioridadeEfetiva({ ...manualBaixa, data: "2026-03-06" }, "2026-03-05")).toBe("urgente");
  });
  it("≤ 5 dias úteis → alta", () => {
    // quinta 05/03 → +5 úteis = quinta 12/03
    expect(prioridadeEfetiva({ ...manualBaixa, data: "2026-03-12" }, "2026-03-05")).toBe("alta");
  });
  it("mais longe → a prioridade manual", () => {
    expect(prioridadeEfetiva({ prioridadeManual: "media", data: "2026-04-30" }, "2026-03-05")).toBe("media");
  });
});

describe("estadoNaAgenda", () => {
  const semInterno = { prazoInterno: null };
  it("atrasada / vence hoje / futura", () => {
    expect(estadoNaAgenda({ ...semInterno, status: "pendente", data: "2026-03-01" }, "2026-03-05")).toBe("atrasada");
    expect(estadoNaAgenda({ ...semInterno, status: "pendente", data: "2026-03-05" }, "2026-03-05")).toBe("vence_hoje");
    expect(estadoNaAgenda({ ...semInterno, status: "pendente", data: "2026-03-20" }, "2026-03-05")).toBe("futura");
  });
  it("hora de fazer: hoje ≥ prazo interno e ainda não venceu (só prazo)", () => {
    expect(
      estadoNaAgenda(
        { status: "pendente", data: "2026-03-20", prazoInterno: "2026-03-13" },
        "2026-03-16",
      ),
    ).toBe("hora_de_fazer");
  });
  it("concluída / cancelada", () => {
    expect(estadoNaAgenda({ ...semInterno, status: "concluida", data: "2026-03-01" }, "2026-03-05")).toBe("concluida");
    expect(estadoNaAgenda({ ...semInterno, status: "cancelada", data: "2026-03-01" }, "2026-03-05")).toBe("cancelada");
  });
});
