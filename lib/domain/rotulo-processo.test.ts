import { describe, it, expect } from "vitest";
import { linhasDoProcesso } from "./rotulo-processo";

describe("linhasDoProcesso", () => {
  it("geral com nome de pasta → lidera pelo nome, sem o jargão 'geral'", () => {
    const r = linhasDoProcesso({
      tipo: "geral",
      numero: "2025/000123",
      pastaCodigo: "2025/000123",
      pastaNome: "Silva x Banco Cruzeiro",
      clienteNome: "José da Silva",
    });
    expect(r.primario).toBe("Silva x Banco Cruzeiro");
    expect(r.secundario).toBe("2025/000123 · José da Silva");
    expect(`${r.primario} ${r.secundario}`.toLowerCase()).not.toContain("geral");
  });

  it("geral sem nome de pasta → lidera pelo código", () => {
    const r = linhasDoProcesso({
      tipo: "geral",
      numero: "2025/000123",
      pastaCodigo: "2025/000123",
      pastaNome: null,
      clienteNome: "José da Silva",
    });
    expect(r.primario).toBe("2025/000123");
    expect(r.secundario).toBe("2025/000123 · José da Silva");
  });

  it("judicial → lidera pelo número, contexto com tipo", () => {
    const r = linhasDoProcesso({
      tipo: "judicial",
      numero: "1000764-35.2025.8.26.0602",
      pastaCodigo: "2025/000123",
      pastaNome: "Silva x Banco Cruzeiro",
      clienteNome: "José da Silva",
    });
    expect(r.primario).toBe("1000764-35.2025.8.26.0602");
    expect(r.secundario).toBe(
      "Silva x Banco Cruzeiro · José da Silva · judicial",
    );
  });

  it("administrativo sem número → 'sem número'", () => {
    const r = linhasDoProcesso({
      tipo: "administrativo",
      numero: null,
      pastaCodigo: "2025/000123",
      pastaNome: null,
      clienteNome: "José da Silva",
    });
    expect(r.primario).toBe("sem número");
    expect(r.secundario).toBe("2025/000123 · José da Silva · administrativo");
  });

  it("sem pasta e sem cliente → secundário só com o tipo", () => {
    const r = linhasDoProcesso({
      tipo: "judicial",
      numero: "1000764-35.2025.8.26.0602",
      pastaCodigo: null,
      pastaNome: null,
      clienteNome: null,
    });
    expect(r.primario).toBe("1000764-35.2025.8.26.0602");
    expect(r.secundario).toBe("judicial");
  });
});
