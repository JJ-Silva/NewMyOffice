import { describe, it, expect } from "vitest";
import {
  podeFazer,
  permissoesEfetivas,
  contextoDoFundador,
  type ContextoAutorizacao,
} from "./autorizacao";
import type { Permissao } from "./permissoes";

function ctx(
  parcial: {
    ativo?: boolean;
    fundador?: boolean;
    rotulo?: Permissao[];
    overrides?: [Permissao, boolean][];
  } = {},
): ContextoAutorizacao {
  return {
    ativo: parcial.ativo ?? true,
    fundador: parcial.fundador ?? false,
    permissoesDoRotulo: new Set(parcial.rotulo ?? []),
    overrides: new Map(parcial.overrides ?? []),
  };
}

describe("podeFazer", () => {
  it("fundador ativo pode qualquer coisa", () => {
    const f = contextoDoFundador();
    expect(podeFazer(f, "rotulos.gerenciar")).toBe(true);
    expect(podeFazer(f, "atividades.excluir")).toBe(true);
  });

  it("membro inativo não faz nada, nem o fundador", () => {
    expect(podeFazer(ctx({ ativo: false, fundador: true }), "clientes.ver")).toBe(
      false,
    );
    expect(
      podeFazer(ctx({ ativo: false, rotulo: ["clientes.ver"] }), "clientes.ver"),
    ).toBe(false);
  });

  it("herda a permissão do rótulo", () => {
    const c = ctx({ rotulo: ["pastas.ver", "pastas.criar"] });
    expect(podeFazer(c, "pastas.criar")).toBe(true);
    expect(podeFazer(c, "pastas.excluir")).toBe(false);
  });

  it("override concede uma permissão fora do rótulo", () => {
    const c = ctx({ rotulo: ["pastas.ver"], overrides: [["pastas.excluir", true]] });
    expect(podeFazer(c, "pastas.excluir")).toBe(true);
  });

  it("override nega uma permissão que o rótulo dá", () => {
    const c = ctx({
      rotulo: ["pastas.ver", "pastas.excluir"],
      overrides: [["pastas.excluir", false]],
    });
    expect(podeFazer(c, "pastas.excluir")).toBe(false);
  });

  it("negado por padrão quando nada bate", () => {
    expect(podeFazer(ctx(), "config.escritorio")).toBe(false);
  });
});

describe("permissoesEfetivas", () => {
  it("aplica os overrides sobre o rótulo", () => {
    const e = permissoesEfetivas(
      ctx({
        rotulo: ["clientes.ver", "clientes.criar", "pastas.ver"],
        overrides: [
          ["clientes.criar", false],
          ["pastas.excluir", true],
        ],
      }),
    );
    expect([...e].sort()).toEqual(
      ["clientes.ver", "pastas.excluir", "pastas.ver"].sort(),
    );
  });

  it("membro inativo tem conjunto vazio", () => {
    expect(
      permissoesEfetivas(ctx({ ativo: false, rotulo: ["clientes.ver"] })).size,
    ).toBe(0);
  });
});
