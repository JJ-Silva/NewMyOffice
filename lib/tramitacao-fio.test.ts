import { describe, it, expect } from "vitest";
import type { AndamentoItem } from "@/lib/db/andamentos";
import { montarFio } from "./tramitacao-fio";

// Um andamento de teste — só os campos que interessam pro montarFio.
function and(over: Partial<AndamentoItem> = {}): AndamentoItem {
  return {
    id: "a1",
    texto: "algo aconteceu",
    origem: "manual",
    autorMembroId: "m-eu",
    autorNome: "Helena Moraes",
    autorPapel: "Advogado",
    criadoEm: "2026-09-06T13:00:00+00:00", // 10:00 BRT
    processoId: "p1",
    processoNumero: "1002517-12.2025.8.26.0510",
    atividadeId: null,
    atividadeTipo: null,
    publicacaoId: null,
    ...over,
  };
}

const OPTS = { meuMembroId: "m-eu", hoje: "2026-09-06", mostrarProcesso: false };

describe("montarFio — agrupamento por dia", () => {
  it("junta andamentos do mesmo dia num grupo só, preservando a ordem de entrada", () => {
    const dias = montarFio(
      [
        and({ id: "a1", criadoEm: "2026-09-04T12:00:00Z" }),
        and({ id: "a2", criadoEm: "2026-09-04T18:00:00Z" }),
      ],
      OPTS,
    );
    expect(dias).toHaveLength(1);
    expect(dias[0].mensagens.map((m) => m.id)).toEqual(["a1", "a2"]);
  });

  it("dias diferentes → grupos diferentes", () => {
    const dias = montarFio(
      [
        and({ id: "a1", criadoEm: "2026-09-03T12:00:00Z" }),
        and({ id: "a2", criadoEm: "2026-09-06T12:00:00Z" }),
      ],
      OPTS,
    );
    expect(dias.map((d) => d.chave)).toEqual(["2026-09-03", "2026-09-06"]);
  });

  it("rótulo Hoje / Ontem / data por extenso", () => {
    const dias = montarFio(
      [
        and({ id: "x", criadoEm: "2026-09-04T12:00:00Z" }),
        and({ id: "y", criadoEm: "2026-09-05T12:00:00Z" }),
        and({ id: "z", criadoEm: "2026-09-06T12:00:00Z" }),
      ],
      OPTS,
    );
    expect(dias.map((d) => d.rotulo)).toEqual([
      "04/09/2026 · sexta-feira",
      "Ontem",
      "Hoje",
    ]);
  });

  it("a hora sai no fuso do Brasil", () => {
    // 00:30 UTC de 07/09 = 21:30 BRT de 06/09
    const [dia] = montarFio(
      [and({ criadoEm: "2026-09-07T00:30:00+00:00" })],
      OPTS,
    );
    expect(dia.chave).toBe("2026-09-06");
    expect(dia.mensagens[0].hora).toBe("21:30");
  });
});

describe("montarFio — autor", () => {
  it("meu andamento vai pra direita (ehMeu)", () => {
    const [d] = montarFio([and({ autorMembroId: "m-eu" })], OPTS);
    expect(d.mensagens[0].ehMeu).toBe(true);
  });

  it("andamento de outro membro não é meu", () => {
    const [d] = montarFio([and({ autorMembroId: "m-outro" })], OPTS);
    expect(d.mensagens[0].ehMeu).toBe(false);
  });

  it("autor null vira Sistema (nunca 'meu'), iniciais MO, cor do design system", () => {
    const [d] = montarFio(
      [and({ autorMembroId: null, autorNome: null, autorPapel: null })],
      OPTS,
    );
    const m = d.mensagens[0];
    expect(m.ehMeu).toBe(false);
    expect(m.autorNome).toBe("Sistema");
    expect(m.iniciais).toBe("MO");
    expect(m.autorPapel).toBe("publicação automática");
    expect(m.cor).toBe("var(--teal)");
  });

  it("a cor do avatar é estável para o mesmo membro", () => {
    const [d] = montarFio(
      [and({ id: "a", autorMembroId: "abc" }), and({ id: "b", autorMembroId: "abc" })],
      OPTS,
    );
    expect(d.mensagens[0].cor).toBe(d.mensagens[1].cor);
  });

  it("iniciais: dois nomes → primeira + última; um nome → duas primeiras letras", () => {
    const [d] = montarFio(
      [
        and({ id: "a", autorMembroId: "z", autorNome: "Rafael Antunes" }),
        and({ id: "b", autorMembroId: "z", autorNome: "Marina" }),
      ],
      OPTS,
    );
    expect(d.mensagens[0].iniciais).toBe("RA");
    expect(d.mensagens[1].iniciais).toBe("MA");
  });
});

describe("montarFio — chip e etiqueta de processo", () => {
  it("atividadeId → chip pro tipo certo", () => {
    const [d] = montarFio(
      [and({ atividadeId: "at1", atividadeTipo: "prazo" })],
      OPTS,
    );
    expect(d.mensagens[0].chip).toEqual({
      href: "/agenda/at1",
      texto: "⏳ ver prazo",
    });
  });

  it("publicacaoId → chip pra publicação", () => {
    const [d] = montarFio([and({ publicacaoId: "pub1" })], OPTS);
    expect(d.mensagens[0].chip).toEqual({
      href: "/publicacoes/pub1",
      texto: "📄 ver publicação",
    });
  });

  it("sem vínculo → sem chip", () => {
    const [d] = montarFio([and()], OPTS);
    expect(d.mensagens[0].chip).toBeNull();
  });

  it("processoNumero só aparece quando mostrarProcesso", () => {
    const semEtiqueta = montarFio([and()], { ...OPTS, mostrarProcesso: false });
    const comEtiqueta = montarFio([and()], { ...OPTS, mostrarProcesso: true });
    expect(semEtiqueta[0].mensagens[0].processoNumero).toBeNull();
    expect(comEtiqueta[0].mensagens[0].processoNumero).toBe(
      "1002517-12.2025.8.26.0510",
    );
  });
});
