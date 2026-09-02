import { describe, it, expect } from "vitest";
import {
  normalizarProcessoDatajud,
  descreverGrau,
  extrairComarcaDoOrgao,
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

describe("extrairComarcaDoOrgao", () => {
  it("pega a comarca do fim do nome (TJSP/SAJ, tudo em caixa alta)", () => {
    expect(extrairComarcaDoOrgao("05 CIVEL DE SOROCABA")).toBe("Sorocaba");
    expect(extrairComarcaDoOrgao("2ª Vara Cível de Sorocaba")).toBe("Sorocaba");
    expect(
      extrairComarcaDoOrgao("Vara da Fazenda Pública da Comarca de Campinas"),
    ).toBe("Campinas");
    expect(extrairComarcaDoOrgao("1ª VARA CRIMINAL DE SÃO JOSÉ DOS CAMPOS")).toBe(
      "São José dos Campos",
    );
  });
  it("sem local no nome → null", () => {
    expect(extrairComarcaDoOrgao("5ª Vara Cível")).toBeNull();
    expect(extrairComarcaDoOrgao("Turma Recursal Cível")).toBeNull();
    expect(extrairComarcaDoOrgao(null)).toBeNull();
  });
});

describe("sugerirCamposDoProcesso", () => {
  it("usa o município quando vem (código IBGE)", () => {
    const dj = normalizarProcessoDatajud(AMOSTRA)!;
    expect(sugerirCamposDoProcesso(dj, "Sorocaba").comarca).toBe("Sorocaba");
  });
  it("sem município, tenta o fim do nome do órgão", () => {
    const dj = normalizarProcessoDatajud({
      numeroProcesso: "1",
      orgaoJulgador: { nome: "05 CIVEL DE SOROCABA" },
      grau: "G1",
    })!;
    expect(sugerirCamposDoProcesso(dj, null)).toEqual({
      tipoAcao: null,
      assunto: null,
      vara: "05 CIVEL DE SOROCABA",
      comarca: "Sorocaba",
      instancia: "1º grau",
      dataDistribuicao: null,
    });
  });
});
