import { describe, it, expect } from "vitest";
import {
  analisarCnj,
  montarCnj,
  calcularDigitoVerificador,
} from "./cnj";

describe("CNJ — parsing e dígito verificador (Res. CNJ 65/2008)", () => {
  it("analisa um número formatado e extrai os componentes", () => {
    // número montado pelo próprio motor (DV correto por construção)
    const numero = montarCnj({
      sequencial: 1234567,
      ano: 2024,
      segmento: 8,
      tribunal: 26,
      origem: 100,
    });
    const r = analisarCnj(numero);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.cnj.partes).toMatchObject({
      sequencial: 1234567,
      ano: 2024,
      segmento: 8,
      tribunal: 26,
      origem: 100,
    });
    expect(r.cnj.digitoConfere).toBe(true);
    expect(r.cnj.justica).toBe("estadual");
    expect(r.cnj.descricaoSegmento).toBe("Justiça Estadual");
  });

  it("aceita o número só com dígitos (sem máscara)", () => {
    const formatado = montarCnj({
      sequencial: 55,
      ano: 2023,
      segmento: 5,
      tribunal: 2,
      origem: 1,
    });
    const soDigitos = formatado.replace(/\D/g, "");
    const r = analisarCnj(soDigitos);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.cnj.formatado).toBe(formatado);
    expect(r.cnj.digitoConfere).toBe(true);
    expect(r.cnj.justica).toBe("trabalho");
  });

  it("detecta dígito verificador errado", () => {
    const bom = montarCnj({
      sequencial: 1,
      ano: 2020,
      segmento: 8,
      tribunal: 26,
      origem: 100,
    });
    // troca o DV por outro valor
    const dvBom = bom.slice(8, 10);
    const dvRuim = dvBom === "00" ? "99" : "00";
    const ruim = bom.slice(0, 8) + dvRuim + bom.slice(10);
    const r = analisarCnj(ruim);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.cnj.digitoConfere).toBe(false);
  });

  it("recusa número com tamanho errado", () => {
    expect(analisarCnj("123").ok).toBe(false);
    expect(analisarCnj("").ok).toBe(false);
    expect(analisarCnj("0001234-56.2024.8.26.010").ok).toBe(false);
  });

  it("classifica os segmentos do Judiciário", () => {
    const seg = (s: number) =>
      analisarCnj(
        montarCnj({ sequencial: 1, ano: 2024, segmento: s, tribunal: 1, origem: 1 }),
      );
    const j = (s: number) => {
      const r = seg(s);
      return r.ok ? r.cnj.justica : "erro";
    };
    expect(j(3)).toBe("superior"); // STJ
    expect(j(4)).toBe("federal");
    expect(j(5)).toBe("trabalho");
    expect(j(6)).toBe("eleitoral");
    expect(j(8)).toBe("estadual");
  });

  it("valida um número CNJ real (dígito confere)", () => {
    // número real (TJAL) usado como vetor de teste em bibliotecas de CNJ
    const r = analisarCnj("0710802-55.2018.8.02.0001");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.cnj.digitoConfere).toBe(true);
    expect(r.cnj.partes).toMatchObject({ ano: 2018, segmento: 8, tribunal: 2 });
  });

  it("calcularDigitoVerificador é consistente com montarCnj", () => {
    const p = { sequencial: 7506, ano: 2011, segmento: 8, tribunal: 26, origem: 100 };
    const dv = calcularDigitoVerificador(p);
    const numero = montarCnj(p);
    expect(numero.slice(8, 10)).toBe(dv);
    const r = analisarCnj(numero);
    expect(r.ok && r.cnj.digitoConfere).toBe(true);
  });
});
