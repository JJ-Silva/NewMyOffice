import { describe, it, expect } from "vitest";
import {
  limparTexto,
  trecho,
  normalizarCnj,
  sugerirPrazo,
  pareceSemPrazo,
} from "./publicacao";

describe("limparTexto", () => {
  it("tira as tags e decodifica entidades, virando parágrafos", () => {
    const html =
      "<p>Vistos.&nbsp;</p>\n<p>Recebo o <strong>recurso</strong>.</p>";
    expect(limparTexto(html)).toBe("Vistos.\n\nRecebo o recurso.");
  });

  it("decodifica entidades nomeadas e numéricas", () => {
    expect(limparTexto("JOS&Eacute; &#39;X&#39;")).toBe("JOSÉ 'X'");
  });

  it("texto puro passa quase igual (só normaliza espaços)", () => {
    expect(limparTexto("Processo 001  -  Intime-se")).toBe(
      "Processo 001 - Intime-se",
    );
  });

  it("string vazia", () => {
    expect(limparTexto("")).toBe("");
  });
});

describe("trecho", () => {
  it("corta no limite com reticências", () => {
    const t = trecho("a".repeat(300), 50);
    expect(t).toHaveLength(50);
    expect(t.endsWith("…")).toBe(true);
  });
  it("texto curto fica inteiro", () => {
    expect(trecho("curto")).toBe("curto");
  });
});

describe("normalizarCnj", () => {
  it("usa o número já mascarado", () => {
    expect(
      normalizarCnj({
        cnj: "0016193-59.2025.8.26.0602",
        numeroProcesso: "00161935920258260602",
      }),
    ).toBe("0016193-59.2025.8.26.0602");
  });

  it("formata a partir dos dígitos quando não veio mascarado", () => {
    expect(
      normalizarCnj({ cnj: null, numeroProcesso: "00161935920258260602" }),
    ).toBe("0016193-59.2025.8.26.0602");
  });

  it("devolve null quando não é um CNJ válido", () => {
    expect(normalizarCnj({ cnj: null, numeroProcesso: "123" })).toBeNull();
    expect(normalizarCnj({ cnj: null, numeroProcesso: null })).toBeNull();
  });
});

describe("sugerirPrazo", () => {
  it("pega os dias do texto ('no prazo de 5 (cinco) dias')", () => {
    const s = sugerirPrazo(
      "Intime-se a parte para que, no prazo de 5 (cinco) dias, junte a guia.",
    );
    expect(s.dias).toBe(5);
  });

  it("entende dias por extenso", () => {
    expect(sugerirPrazo("apresentar no prazo de quinze dias").dias).toBe(15);
  });

  it("identifica contrarrazões com 'prazo legal' → tipo + dias padrão", () => {
    const s = sugerirPrazo(
      "Intime-se a parte contrária para contrarrazões, no prazo legal.",
    );
    expect(s.tipoProvavel).toBe("Contrarrazões a REsp/RE");
    expect(s.dias).toBe(15);
  });

  it("identifica contestação", () => {
    const s = sugerirPrazo("Cite-se a ré para apresentar contestação.");
    expect(s.tipoProvavel).toBe("Contestação");
    expect(s.dias).toBe(15);
  });

  it("embargos de declaração: dias do texto vencem o padrão", () => {
    const s = sugerirPrazo(
      "Opostos embargos de declaração, intime-se a parte no prazo de 5 dias.",
    );
    expect(s.tipoProvavel).toBe("Embargos de declaração");
    expect(s.dias).toBe(5);
  });

  it("sem pista nenhuma → tudo nulo, explicação manda escolher", () => {
    const s = sugerirPrazo("Aguarde-se. Int.");
    expect(s.tipoProvavel).toBeNull();
    expect(s.dias).toBeNull();
    expect(s.explicacao.toLowerCase()).toContain("manual");
  });
});

describe("pareceSemPrazo", () => {
  it("intimação informativa", () => {
    expect(pareceSemPrazo("Homologo o acordo. Arquive-se. Int.")).toBe(true);
  });
  it("intimação com prazo NÃO parece sem prazo", () => {
    expect(
      pareceSemPrazo("Intime-se para pagar no prazo de 15 dias."),
    ).toBe(false);
  });
});
