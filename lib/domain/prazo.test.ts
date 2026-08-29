import { describe, it, expect } from "vitest";
import {
  calcularPrazo,
  prazoInternoAPartirDoFatal,
  type Calendario,
  type EntradaCalculoPrazo,
} from "./prazo";
import { nomeDoDiaDaSemana } from "./datas";

// Calendário de teste "TJ-TESTE" (docs/MYOFFICE_MOTOR_TESTES.md — 2026).
const TJ_TESTE: Calendario = {
  feriados: [
    { data: "2026-01-01", descricao: "Confraternização", repeteTodoAno: false },
    { data: "2026-02-16", descricao: "Carnaval", repeteTodoAno: false },
    { data: "2026-02-17", descricao: "Carnaval", repeteTodoAno: false },
    { data: "2026-04-03", descricao: "Paixão de Cristo", repeteTodoAno: false },
    { data: "2026-04-21", descricao: "Tiradentes", repeteTodoAno: false },
    { data: "2026-05-01", descricao: "Dia do Trabalho", repeteTodoAno: false },
    { data: "2026-06-04", descricao: "Corpus Christi", repeteTodoAno: false },
    { data: "2026-09-07", descricao: "Independência", repeteTodoAno: false },
    { data: "2026-10-12", descricao: "N. Sra. Aparecida", repeteTodoAno: false },
    { data: "2026-11-02", descricao: "Finados", repeteTodoAno: false },
    { data: "2026-11-20", descricao: "Consciência Negra", repeteTodoAno: false },
    { data: "2026-12-25", descricao: "Natal", repeteTodoAno: false },
  ],
  periodos: [
    {
      dataInicio: "2026-12-20",
      dataFim: "2027-01-20",
      descricao: "Recesso forense",
      repeteTodoAno: false,
    },
  ],
};

// Atalho para montar a entrada processual comum dos testes.
function entradaProcessual(
  over: Partial<EntradaCalculoPrazo> & Pick<EntradaCalculoPrazo, "dataInicial" | "dias">,
): EntradaCalculoPrazo {
  return {
    natureza: "processual",
    dobro: false,
    excluirFeriados: true,
    margem: 5,
    calendario: TJ_TESTE,
    hoje: "2026-01-01",
    ...over,
  };
}

describe("motor de prazo — casos T1–T13 (docs/MYOFFICE_MOTOR_TESTES.md)", () => {
  it("T1 — processual simples, sem feriado no intervalo", () => {
    const r = calcularPrazo(
      entradaProcessual({ dias: 15, dataInicial: "2026-03-04" }),
    );
    expect(r.prazoFatalCalculado).toBe("2026-03-24");
    expect(nomeDoDiaDaSemana(r.prazoFatalCalculado)).toBe("terça-feira");
    expect(r.prazoInternoCalculado).toBe("2026-03-17");
    expect(nomeDoDiaDaSemana(r.prazoInternoCalculado)).toBe("terça-feira");
    expect(r.prazoApertado).toBe(false);
  });

  it("T2 — processual com feriado no meio (Paixão 03/04)", () => {
    const r = calcularPrazo(
      entradaProcessual({ dias: 15, dataInicial: "2026-03-27" }),
    );
    expect(r.prazoFatalCalculado).toBe("2026-04-17");
    expect(nomeDoDiaDaSemana(r.prazoFatalCalculado)).toBe("sexta-feira");
    expect(r.prazoInternoCalculado).toBe("2026-04-10");
    // o feriado de 03/04 entra na lista de dias pulados
    expect(
      r.memoriaCalculo.diasPulados.some((d) => d.data === "2026-04-03"),
    ).toBe(true);
  });

  it("T3 — prazo em dobro (N = 30)", () => {
    const r = calcularPrazo(
      entradaProcessual({ dias: 15, dobro: true, dataInicial: "2026-03-02" }),
    );
    expect(r.prazoFatalCalculado).toBe("2026-04-13");
    expect(nomeDoDiaDaSemana(r.prazoFatalCalculado)).toBe("segunda-feira");
    expect(r.prazoInternoCalculado).toBe("2026-04-06");
    expect(r.memoriaCalculo.nDias).toBe(30);
  });

  it("T4 — prazo curto: a margem estoura → prazo apertado", () => {
    const r = calcularPrazo(
      entradaProcessual({ dias: 5, dataInicial: "2026-04-16" }),
    );
    expect(r.prazoFatalCalculado).toBe("2026-04-23");
    expect(nomeDoDiaDaSemana(r.prazoFatalCalculado)).toBe("quinta-feira");
    expect(r.prazoApertado).toBe(true);
    // N − margem = 5 − 5 = 0 → interno = max(dataInicial, hoje)
    const r2 = calcularPrazo(
      entradaProcessual({ dias: 5, dataInicial: "2026-04-16", hoje: "2026-04-20" }),
    );
    expect(r2.prazoInternoCalculado).toBe("2026-04-20"); // hoje > dataInicial
    const r3 = calcularPrazo(
      entradaProcessual({ dias: 5, dataInicial: "2026-04-16", hoje: "2026-01-01" }),
    );
    expect(r3.prazoInternoCalculado).toBe("2026-04-16"); // dataInicial > hoje
  });

  it("T5 — disponibilização em sábado → dia 1 é a segunda seguinte", () => {
    const r = calcularPrazo(
      entradaProcessual({ dias: 15, dataInicial: "2026-03-07" }),
    );
    expect(r.memoriaCalculo.dia1).toBe("2026-03-09");
    expect(r.prazoFatalCalculado).toBe("2026-03-27");
    expect(nomeDoDiaDaSemana(r.prazoFatalCalculado)).toBe("sexta-feira");
    expect(r.prazoInternoCalculado).toBe("2026-03-20");
  });

  it("T6 — disponibilização num feriado (Paixão 03/04)", () => {
    const r = calcularPrazo(
      entradaProcessual({ dias: 15, dataInicial: "2026-04-03" }),
    );
    expect(r.memoriaCalculo.dia1).toBe("2026-04-06");
    expect(r.prazoFatalCalculado).toBe("2026-04-27");
    expect(nomeDoDiaDaSemana(r.prazoFatalCalculado)).toBe("segunda-feira");
    expect(r.prazoInternoCalculado).toBe("2026-04-17");
  });

  it("T7-novo — prazo interna (dias úteis, sem tribunal)", () => {
    const r = calcularPrazo({
      natureza: "interna",
      dataInicial: "2026-03-02",
      dias: 10,
      dobro: false,
      excluirFeriados: true,
      margem: 5,
      calendario: { feriados: [], periodos: [] },
      hoje: "2026-01-01",
    });
    expect(r.prazoFatalCalculado).toBe("2026-03-13");
    expect(nomeDoDiaDaSemana(r.prazoFatalCalculado)).toBe("sexta-feira");
    expect(r.prazoInternoCalculado).toBe("2026-03-06");
    expect(r.memoriaCalculo.marcosCpc).toBeNull(); // interna não tem marcos CPC
  });

  it("T9 — prazo cruzando o recesso forense", () => {
    const r = calcularPrazo(
      entradaProcessual({ dias: 15, dataInicial: "2026-12-14" }),
    );
    expect(r.prazoFatalCalculado).toBe("2027-02-03");
    expect(nomeDoDiaDaSemana(r.prazoFatalCalculado)).toBe("quarta-feira");
    expect(r.prazoInternoCalculado).toBe("2027-01-27");
    // dias dentro do recesso aparecem como pulados por "recesso"
    expect(
      r.memoriaCalculo.diasPulados.some((d) =>
        d.motivo.startsWith("recesso:"),
      ),
    ).toBe(true);
  });

  it("T10 — prazo material NÃO é calculado pelo motor (a UI pede a data)", () => {
    // Aqui só documentamos: para 'material' o fluxo grava a data informada e
    // deriva o interno com prazoInternoAPartirDoFatal. Ex.: fatal 15/04/2026.
    const interno = prazoInternoAPartirDoFatal(
      "2026-04-15",
      5,
      TJ_TESTE,
      true,
    );
    expect(interno).toBe("2026-04-08");
  });

  it("T11 — recálculo do interno após ajuste manual do fatal", () => {
    // T1 calculou fatal 24/03; advogado corrige para 20/03 (litisconsortes
    // com o mesmo procurador). O interno re-deriva: 20/03 − 5 úteis.
    const interno = prazoInternoAPartirDoFatal(
      "2026-03-20",
      5,
      TJ_TESTE,
      true,
    );
    expect(interno).toBe("2026-03-13");
  });

  it("T12 — aviso de calendário incompleto (intervalo sem feriados)", () => {
    // Calendário só com Natal; prazo de out→nov/2026, sem nada no intervalo.
    const soNatal: Calendario = {
      feriados: [
        { data: "2026-12-25", descricao: "Natal", repeteTodoAno: false },
      ],
      periodos: [],
    };
    const r = calcularPrazo({
      natureza: "processual",
      dataInicial: "2026-10-26",
      dias: 15,
      dobro: false,
      excluirFeriados: true,
      margem: 5,
      calendario: soNatal,
      hoje: "2026-01-01",
    });
    expect(r.avisoCalendarioIncompleto).not.toBeNull();
    expect(r.avisoCalendarioIncompleto).toContain("out/2026");
    expect(r.avisoCalendarioIncompleto).toContain("nov/2026");
  });

  it("T12b — tribunal sem NENHUM feriado cadastrado → aviso", () => {
    const r = calcularPrazo({
      natureza: "processual",
      dataInicial: "2026-03-04",
      dias: 15,
      dobro: false,
      excluirFeriados: true,
      margem: 5,
      calendario: { feriados: [], periodos: [] },
      hoje: "2026-01-01",
    });
    expect(r.avisoCalendarioIncompleto).toContain("Nenhum feriado cadastrado");
  });

  it("T13 — prazo processual em dobro (30 úteis) — idêntico ao T3", () => {
    const r = calcularPrazo(
      entradaProcessual({ dias: 15, dobro: true, dataInicial: "2026-03-02" }),
    );
    expect(r.prazoFatalCalculado).toBe("2026-04-13");
    expect(r.prazoInternoCalculado).toBe("2026-04-06");
  });

  it("T1 não dispara aviso (intervalo de um mês só, calendário mantido)", () => {
    const r = calcularPrazo(
      entradaProcessual({ dias: 15, dataInicial: "2026-03-04" }),
    );
    expect(r.avisoCalendarioIncompleto).toBeNull();
  });

  it("sem excluir feriados: conta só sábados e domingos", () => {
    const r = calcularPrazo(
      entradaProcessual({
        dias: 15,
        dataInicial: "2026-03-27",
        excluirFeriados: false,
      }),
    );
    // sem pular 03/04 (Paixão), o fatal cai um dia útil antes de T2
    expect(r.prazoFatalCalculado).toBe("2026-04-16");
    expect(r.avisoCalendarioIncompleto).toBeNull();
  });
});
