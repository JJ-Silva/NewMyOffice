import { describe, it, expect } from "vitest";
import { filtrarOpcoes, type OpcaoComboBox } from "./combobox-filtro";

const OPCOES: OpcaoComboBox[] = [
  { value: "826", label: "TJSP — Tribunal de Justiça de São Paulo" },
  { value: "813", label: "TJMG — Tribunal de Justiça de Minas Gerais" },
  { value: "403", label: "TRF3 — Tribunal Regional Federal da 3ª Região" },
  { value: "515", label: "TRT15 — Tribunal Regional do Trabalho da 15ª Região" },
];

describe("filtrarOpcoes", () => {
  it("texto vazio → devolve tudo", () => {
    expect(filtrarOpcoes(OPCOES, "")).toHaveLength(4);
    expect(filtrarOpcoes(OPCOES, "   ")).toHaveLength(4);
  });

  it("casa por sigla", () => {
    expect(filtrarOpcoes(OPCOES, "tjsp").map((o) => o.value)).toEqual(["826"]);
  });

  it("casa no meio do label", () => {
    expect(filtrarOpcoes(OPCOES, "minas").map((o) => o.value)).toEqual(["813"]);
  });

  it("acento-insensível nos dois lados", () => {
    expect(filtrarOpcoes(OPCOES, "sao paulo").map((o) => o.value)).toEqual(["826"]);
    expect(filtrarOpcoes(OPCOES, "justiça").map((o) => o.value).sort()).toEqual([
      "813",
      "826",
    ]);
  });

  it("case-insensitive", () => {
    expect(filtrarOpcoes(OPCOES, "TRF3")).toHaveLength(1);
    expect(filtrarOpcoes(OPCOES, "trf3")).toHaveLength(1);
  });

  it("sem match → lista vazia", () => {
    expect(filtrarOpcoes(OPCOES, "xyz")).toEqual([]);
  });
});
