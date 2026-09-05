import { describe, it, expect } from "vitest";
import { montarCnj } from "./cnj";
import { interpretarNumeroProcesso } from "./numero-processo";

// Vetores de CNJ montados pelo próprio motor (DV correto por construção).
const cnjTjsp = montarCnj({
  sequencial: 1234567,
  ano: 2024,
  segmento: 8,
  tribunal: 26,
  origem: 100,
}); // TJSP → código 826

const cnjTrt15 = montarCnj({
  sequencial: 55,
  ano: 2023,
  segmento: 5,
  tribunal: 15,
  origem: 1,
}); // TRT 15ª → código 515

describe("interpretarNumeroProcesso", () => {
  it("campo vazio → erro", () => {
    const r = interpretarNumeroProcesso("", 826);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.erro).toMatch(/informe/i);
  });

  it("CNJ → tribunal vem do número, ignora a lista", () => {
    // passa um tribunal errado na lista de propósito
    const r = interpretarNumeroProcesso(cnjTjsp, 515);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.numero.tribunalCodigo).toBe(826);
    expect(r.numero.cnjFormatado).toBe(cnjTjsp);
    expect(r.numero.numero).toBe(cnjTjsp);
    expect(r.numero.justica).toBe("estadual");
    expect(r.numero.digitoConfere).toBe(true);
    expect(r.numero.cnjPartes).toMatchObject({ ano: 2024, segmento: 8, tribunal: 26 });
  });

  it("CNJ sem tribunal na lista → funciona mesmo assim", () => {
    const r = interpretarNumeroProcesso(cnjTrt15, null);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.numero.tribunalCodigo).toBe(515);
  });

  it("CNJ só com dígitos (sem máscara) → normaliza para o formatado", () => {
    const r = interpretarNumeroProcesso(cnjTjsp.replace(/\D/g, ""), null);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.numero.numero).toBe(cnjTjsp);
  });

  it("CNJ com dígito verificador errado → aceita, mas marca digitoConfere=false", () => {
    const dv = cnjTjsp.slice(8, 10);
    const ruim = cnjTjsp.slice(0, 8) + (dv === "00" ? "99" : "00") + cnjTjsp.slice(10);
    const r = interpretarNumeroProcesso(ruim, null);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.numero.digitoConfere).toBe(false);
    expect(r.numero.tribunalCodigo).toBe(826);
  });

  it("número livre (REsp) com tribunal da lista → texto livre + tribunal escolhido", () => {
    const r = interpretarNumeroProcesso("REsp 1.234.567/SP", 500); // STJ
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.numero.numero).toBe("REsp 1.234.567/SP");
    expect(r.numero.cnjFormatado).toBeNull();
    expect(r.numero.cnjPartes).toBeNull();
    expect(r.numero.justica).toBeNull();
    expect(r.numero.tribunalCodigo).toBe(500);
  });

  it("número livre sem tribunal → erro 'Escolha o tribunal'", () => {
    const r = interpretarNumeroProcesso("RE 999.888", null);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.erro).toMatch(/escolha o tribunal/i);
  });

  it("número livre com código de tribunal inexistente → erro", () => {
    const r = interpretarNumeroProcesso("processo antigo 123/2005", 999);
    expect(r.ok).toBe(false);
  });

  it("apara espaços do número livre", () => {
    const r = interpretarNumeroProcesso("  0001/2005  ", 826);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.numero.numero).toBe("0001/2005");
  });
});
