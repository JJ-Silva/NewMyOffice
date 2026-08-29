import { describe, it, expect } from "vitest";
import { podeFazer } from "./autorizacao";

describe("podeFazer", () => {
  it("dono ativo acessa Configurações", () => {
    expect(podeFazer({ papel: "dono", ativo: true }, "acessar_configuracoes")).toBe(true);
  });

  it("advogado ativo NÃO acessa Configurações", () => {
    expect(podeFazer({ papel: "advogado", ativo: true }, "acessar_configuracoes")).toBe(false);
  });

  it("secretaria ativa NÃO acessa Configurações", () => {
    expect(podeFazer({ papel: "secretaria", ativo: true }, "acessar_configuracoes")).toBe(false);
  });

  it("qualquer membro ativo trabalha (prazos, pastas, clientes)", () => {
    expect(podeFazer({ papel: "advogado", ativo: true }, "trabalhar")).toBe(true);
    expect(podeFazer({ papel: "secretaria", ativo: true }, "trabalhar")).toBe(true);
  });

  it("membro inativo não faz nada", () => {
    expect(podeFazer({ papel: "dono", ativo: false }, "acessar_configuracoes")).toBe(false);
    expect(podeFazer({ papel: "advogado", ativo: false }, "trabalhar")).toBe(false);
  });
});
