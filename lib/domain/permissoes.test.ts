import { describe, it, expect } from "vitest";
import {
  GRUPOS_PERMISSAO,
  TODAS_PERMISSOES,
  ehPermissao,
  garantirDependencias,
  rotuloDaPermissao,
  PRESET_ADVOGADO,
  PRESET_SECRETARIA,
  PRESET_ESTAGIARIO,
} from "./permissoes";

describe("catálogo de permissões", () => {
  it("não tem chaves duplicadas", () => {
    expect(new Set(TODAS_PERMISSOES).size).toBe(TODAS_PERMISSOES.length);
  });

  it("toda chave está no formato grupo.acao", () => {
    for (const p of TODAS_PERMISSOES) {
      expect(p).toMatch(/^[a-z]+\.[a-z_]+$/);
    }
  });

  it("verChave de cada grupo, quando existe, aponta para um item do grupo", () => {
    for (const g of GRUPOS_PERMISSAO) {
      if (!g.verChave) continue;
      expect(g.itens.some((i) => i.chave === g.verChave)).toBe(true);
    }
  });
});

describe("rotuloDaPermissao", () => {
  it("mostra grupo · item", () => {
    expect(rotuloDaPermissao("pastas.excluir")).toBe("Pastas · Excluir pasta");
  });
  it("tem rótulo para toda permissão do catálogo", () => {
    for (const p of TODAS_PERMISSOES) {
      expect(rotuloDaPermissao(p)).toContain(" · ");
    }
  });
});

describe("ehPermissao", () => {
  it("aceita conhecidas e rejeita inventadas", () => {
    expect(ehPermissao("pastas.ver")).toBe(true);
    expect(ehPermissao("pastas.dominar")).toBe(false);
    expect(ehPermissao("")).toBe(false);
  });
});

describe("garantirDependencias", () => {
  it("adiciona o .ver do grupo quando há qualquer ação", () => {
    expect(garantirDependencias(["pastas.excluir"])).toEqual([
      "pastas.ver",
      "pastas.excluir",
    ]);
  });

  it("descarta chaves desconhecidas", () => {
    expect(garantirDependencias(["pastas.ver", "xpto.foo"])).toEqual([
      "pastas.ver",
    ]);
  });

  it("não inventa .ver para o grupo config (que não tem verChave)", () => {
    expect(garantirDependencias(["config.catalogos"])).toEqual([
      "config.catalogos",
    ]);
  });

  it("devolve na ordem canônica do catálogo", () => {
    const fora = garantirDependencias([
      "publicacoes.triar",
      "clientes.criar",
      "atividades.ver",
    ]);
    const indices = fora.map((p) => TODAS_PERMISSOES.indexOf(p));
    expect(indices).toEqual([...indices].sort((a, b) => a - b));
  });
});

describe("presets", () => {
  it("advogado não gere equipe/rótulos nem mexe nos dados do escritório", () => {
    expect(PRESET_ADVOGADO).not.toContain("membros.gerenciar");
    expect(PRESET_ADVOGADO).not.toContain("rotulos.gerenciar");
    expect(PRESET_ADVOGADO).not.toContain("config.escritorio");
  });

  it("secretária e estagiário não têm exclusões", () => {
    for (const p of [...PRESET_SECRETARIA, ...PRESET_ESTAGIARIO]) {
      expect(p.endsWith(".excluir")).toBe(false);
    }
  });

  it("estagiário não ajusta prazo à mão", () => {
    expect(PRESET_ESTAGIARIO).not.toContain("atividades.ajustar_prazo");
  });

  it("todo preset é internamente consistente (passa por garantirDependencias)", () => {
    for (const preset of [PRESET_ADVOGADO, PRESET_SECRETARIA, PRESET_ESTAGIARIO]) {
      expect(garantirDependencias(preset)).toEqual(preset);
    }
  });
});
