import { describe, it, expect } from "vitest";
import {
  normalizarProcessoDatajud,
  descreverGrau,
  sugerirCamposDoProcesso,
} from "./processo-datajud";

// Amostra do formato real do _source do DataJud (TJSP).
const AMOSTRA = {
  numeroProcesso: "10208912820248260602",
  classe: { codigo: 436, nome: "Procedimento Comum Cível" },
  assuntos: [{ codigo: 7691, nome: "Seguro" }],
  orgaoJulgador: {
    codigoMunicipioIBGE: 3552205,
    codigo: 8781,
    nome: "2ª Vara Cível",
  },
  grau: "G1",
  dataAjuizamento: "20240503155810", // AAAAMMDDHHmmss, como o DataJud manda
};

describe("normalizarProcessoDatajud", () => {
  it("extrai os campos úteis", () => {
    const dj = normalizarProcessoDatajud(AMOSTRA);
    expect(dj).toEqual({
      numeroDigitos: "10208912820248260602",
      classe: "Procedimento Comum Cível",
      assunto: "Seguro",
      orgaoJulgador: "2ª Vara Cível",
      municipioIbge: 3552205,
      grau: "G1",
      dataAjuizamento: "2024-05-03",
    });
  });

  it("nulo/vazio → null", () => {
    expect(normalizarProcessoDatajud(null)).toBeNull();
    expect(normalizarProcessoDatajud(undefined)).toBeNull();
  });

  it("tolera campos ausentes", () => {
    const dj = normalizarProcessoDatajud({ numeroProcesso: "123" });
    expect(dj?.classe).toBeNull();
    expect(dj?.municipioIbge).toBeNull();
    expect(dj?.dataAjuizamento).toBeNull();
  });

  it("aceita data ISO também", () => {
    const dj = normalizarProcessoDatajud({
      numeroProcesso: "1",
      dataAjuizamento: "2024-05-03T00:00:00.000Z",
    });
    expect(dj?.dataAjuizamento).toBe("2024-05-03");
  });
});

describe("descreverGrau", () => {
  it("traduz os graus conhecidos", () => {
    expect(descreverGrau("G1")).toBe("1º grau");
    expect(descreverGrau("G2")).toBe("2º grau");
    expect(descreverGrau("xyz")).toBe("xyz");
    expect(descreverGrau(null)).toBeNull();
  });
});

describe("sugerirCamposDoProcesso", () => {
  it("monta os campos do formulário", () => {
    const dj = normalizarProcessoDatajud(AMOSTRA)!;
    expect(sugerirCamposDoProcesso(dj, "Sorocaba")).toEqual({
      tipoAcao: "Procedimento Comum Cível",
      assunto: "Seguro",
      vara: "2ª Vara Cível",
      comarca: "Sorocaba",
      instancia: "1º grau",
      dataDistribuicao: "2024-05-03",
    });
  });
});
