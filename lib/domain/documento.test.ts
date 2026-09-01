import { describe, it, expect } from "vitest";
import {
  apenasDigitos,
  normalizarCpfCnpj,
  formatarCpfCnpj,
  pareceCpfCnpj,
} from "./documento";

describe("apenasDigitos", () => {
  it("tira tudo que não é dígito", () => {
    expect(apenasDigitos("274.488.578-94")).toBe("27448857894");
    expect(apenasDigitos("35.035.287/0001-70")).toBe("35035287000170");
    expect(apenasDigitos(null)).toBe("");
  });
});

describe("normalizarCpfCnpj", () => {
  it("grava só os dígitos", () => {
    expect(normalizarCpfCnpj("274.488.578-94")).toBe("27448857894");
    expect(normalizarCpfCnpj("  27448857894 ")).toBe("27448857894");
  });
  it("texto sem dígito (placeholder) fica como está", () => {
    expect(normalizarCpfCnpj("(sem doc) José Ednaldo")).toBe(
      "(sem doc) José Ednaldo",
    );
  });
});

describe("formatarCpfCnpj", () => {
  it("11 dígitos → CPF", () => {
    expect(formatarCpfCnpj("27448857894")).toBe("274.488.578-94");
    expect(formatarCpfCnpj("274.488.578-94")).toBe("274.488.578-94");
  });
  it("14 dígitos → CNPJ", () => {
    expect(formatarCpfCnpj("35035287000170")).toBe("35.035.287/0001-70");
  });
  it("outra coisa volta como veio", () => {
    expect(formatarCpfCnpj("(sem doc) Fulano")).toBe("(sem doc) Fulano");
    expect(formatarCpfCnpj("123")).toBe("123");
    expect(formatarCpfCnpj(null)).toBe("");
  });
});

describe("pareceCpfCnpj", () => {
  it("11 ou 14 dígitos", () => {
    expect(pareceCpfCnpj("274.488.578-94")).toBe(true);
    expect(pareceCpfCnpj("35035287000170")).toBe(true);
    expect(pareceCpfCnpj("123")).toBe(false);
    expect(pareceCpfCnpj("(sem doc) X")).toBe(false);
  });
});
