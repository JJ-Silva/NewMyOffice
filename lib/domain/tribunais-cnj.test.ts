import { describe, it, expect } from "vitest";
import { identificarTribunal } from "./tribunais-cnj";
import { analisarCnj } from "./cnj";

describe("identificarTribunal", () => {
  it("superiores", () => {
    expect(identificarTribunal({ segmento: 1, tribunal: 0 })).toMatchObject({
      sigla: "STF",
      codigo: 100,
    });
    expect(identificarTribunal({ segmento: 3, tribunal: 0 })?.sigla).toBe("STJ");
  });

  it("TJSP a partir de 8.26", () => {
    expect(identificarTribunal({ segmento: 8, tribunal: 26 })).toEqual({
      codigo: 826,
      sigla: "TJSP",
      nome: "Tribunal de Justiça de São Paulo",
    });
  });

  it("outros TJs conhecidos", () => {
    expect(identificarTribunal({ segmento: 8, tribunal: 19 })?.sigla).toBe("TJRJ");
    expect(identificarTribunal({ segmento: 8, tribunal: 13 })?.sigla).toBe("TJMG");
    expect(identificarTribunal({ segmento: 8, tribunal: 21 })?.sigla).toBe("TJRS");
    expect(identificarTribunal({ segmento: 8, tribunal: 7 })?.sigla).toBe("TJDFT");
  });

  it("TRF3 e TRT15", () => {
    expect(identificarTribunal({ segmento: 4, tribunal: 3 })?.sigla).toBe("TRF3");
    expect(identificarTribunal({ segmento: 5, tribunal: 15 })).toMatchObject({
      codigo: 515,
      sigla: "TRT15",
    });
    expect(identificarTribunal({ segmento: 5, tribunal: 0 })?.sigla).toBe("TST");
  });

  it("eleitoral e militar", () => {
    expect(identificarTribunal({ segmento: 6, tribunal: 26 })?.sigla).toBe("TRE-SP");
    expect(identificarTribunal({ segmento: 6, tribunal: 0 })?.sigla).toBe("TSE");
    expect(identificarTribunal({ segmento: 7, tribunal: 0 })?.sigla).toBe("STM");
    expect(identificarTribunal({ segmento: 9, tribunal: 26 })?.sigla).toBe("TJM-SP");
  });

  it("código inexistente → null", () => {
    expect(identificarTribunal({ segmento: 8, tribunal: 99 })).toBeNull();
    expect(identificarTribunal({ segmento: 0, tribunal: 0 })).toBeNull();
    expect(identificarTribunal({ segmento: 9, tribunal: 1 })).toBeNull();
  });

  it("integra com analisarCnj (CNJs reais deste projeto)", () => {
    const a = analisarCnj("1020891-28.2024.8.26.0602");
    expect(a.ok).toBe(true);
    if (a.ok) {
      const t = identificarTribunal(a.cnj.partes);
      expect(t?.sigla).toBe("TJSP");
    }
  });
});
