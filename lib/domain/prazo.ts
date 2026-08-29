// Motor de cálculo de prazo — porte fiel da função VBA `Contar_Prazos`
// (docs/referencia/funcao-vba-Contar_Prazos.txt), conforme o §4.B do
// docs/MYOFFICE_MVP_PLANO.md e os casos T1–T13 de docs/MYOFFICE_MOTOR_TESTES.md.
//
// TypeScript puro: recebe dados (inclusive o calendário do tribunal) e devolve
// dados. Nenhum acesso a banco. É o código mais auditável do sistema — cálculo
// de prazo é responsabilidade civil (plano §1.1).
//
// Princípio herdado da planilha: "sempre errei pelo seguro — nunca perder prazo".
//
// DECISÕES TRAVADAS (plano §5):
//  • Opção A — a data de entrada (disponibilização no DJEN) é o DIA 1. Não se
//    exclui o dia do começo. Sai ~2 dias úteis antes do CPC art. 224 §§2º–3º
//    estrito, de propósito. Os marcos do CPC ficam na memória, informativos.
//  • v1 calcula `processual` e `interna`, ambos em DIAS ÚTEIS. `material` não é
//    calculado (a UI pede a data direto).
//  • Prazo interno = prazo fatal − margem (5 dias úteis, config do escritório),
//    contados para trás; sempre cai em dia útil; NÃO prorroga.

import * as datas from "./datas";

// ── Calendário do tribunal (o motor recebe pronto) ──────────────────────────
export type FeriadoCalendario = {
  data: string; // 'AAAA-MM-DD'
  descricao: string;
  repeteTodoAno: boolean; // se true, só mês/dia importam
};

export type PeriodoNaoUtilCalendario = {
  dataInicio: string; // 'AAAA-MM-DD'
  dataFim: string;
  descricao: string;
  repeteTodoAno: boolean;
};

export type Calendario = {
  feriados: FeriadoCalendario[];
  periodos: PeriodoNaoUtilCalendario[];
};

export const CALENDARIO_VAZIO: Calendario = { feriados: [], periodos: [] };

// ── Entrada e saída ────────────────────────────────────────────────────────
export type EntradaCalculoPrazo = {
  natureza: "processual" | "interna";
  // processual: data da disponibilização no DJEN · interna: data de início informada
  dataInicial: string; // 'AAAA-MM-DD'
  dias: number; // N — de configuracao_contagem.dias (default tipo_atividade.dias_padrao)
  dobro: boolean; // prazo em dobro (situação da parte)
  excluirFeriados: boolean; // default true; se false, pula só sábado/domingo
  margem: number; // dias úteis da margem interna (configuracao_escritorio, default 5)
  calendario: Calendario; // feriados + períodos do tribunal do prazo (vazio = "sem tribunal")
  hoje: string; // 'AAAA-MM-DD' — usado só no caso "prazo apertado"
};

export type DiaPulado = {
  data: string;
  motivo: "fim de semana" | string; // 'fim de semana' | 'feriado: <descr>' | 'recesso: <descr>'
};

export type MarcosCpc = {
  disponibilizacao: string;
  publicacaoCpc: string; // 1º dia útil após a disponibilização (art. 224 §3º)
  inicioContagemCpc: string; // 1º dia útil após a publicação
  prazoFatalCpcEstrito: string; // se seguíssemos o CPC à risca (informativo)
  observacao: string;
};

export type MemoriaCalculo = {
  natureza: "processual" | "interna";
  dataInicial: string;
  nDias: number; // N já dobrado, se for o caso
  nDiasInformado: number; // N como veio (antes de dobrar)
  dobro: boolean;
  margem: number;
  dia1: string;
  diasPulados: DiaPulado[];
  prazoFatalCalculado: string;
  prazoInternoCalculado: string;
  prazoApertado: boolean;
  marcosCpc: MarcosCpc | null; // só para 'processual'
};

export type ResultadoCalculoPrazo = {
  prazoFatalCalculado: string;
  prazoInternoCalculado: string;
  prazoApertado: boolean;
  avisoCalendarioIncompleto: string | null;
  memoriaCalculo: MemoriaCalculo;
};

// ── Avaliação de um dia ────────────────────────────────────────────────────
export type AvaliacaoDia = { util: boolean; motivo: DiaPulado["motivo"] | null };

export function avaliarDia(
  iso: string,
  calendario: Calendario,
  excluirFeriados: boolean,
): AvaliacaoDia {
  if (datas.ehSabadoOuDomingo(iso)) {
    return { util: false, motivo: "fim de semana" };
  }
  if (!excluirFeriados) {
    return { util: true, motivo: null };
  }
  const periodo = periodoNaData(iso, calendario.periodos);
  if (periodo) {
    return { util: false, motivo: `recesso: ${periodo.descricao}` };
  }
  const feriado = feriadoNaData(iso, calendario.feriados);
  if (feriado) {
    return { util: false, motivo: `feriado: ${feriado.descricao}` };
  }
  return { util: true, motivo: null };
}

function feriadoNaData(
  iso: string,
  feriados: FeriadoCalendario[],
): FeriadoCalendario | null {
  const alvo = datas.partesDaData(iso);
  for (const f of feriados) {
    const p = datas.partesDaData(f.data);
    if (f.repeteTodoAno) {
      if (p.mes === alvo.mes && p.dia === alvo.dia) return f;
    } else if (f.data === iso) {
      return f;
    }
  }
  return null;
}

function periodoNaData(
  iso: string,
  periodos: PeriodoNaoUtilCalendario[],
): PeriodoNaoUtilCalendario | null {
  for (const p of periodos) {
    if (!p.repeteTodoAno) {
      if (
        datas.compararDatas(iso, p.dataInicio) >= 0 &&
        datas.compararDatas(iso, p.dataFim) <= 0
      ) {
        return p;
      }
      continue;
    }
    // repete todo ano: compara só mês/dia; trata a virada de ano (20/12 → 20/01)
    const alvo = mmdd(iso);
    const ini = mmdd(p.dataInicio);
    const fim = mmdd(p.dataFim);
    const dentro =
      ini <= fim ? alvo >= ini && alvo <= fim : alvo >= ini || alvo <= fim;
    if (dentro) return p;
  }
  return null;
}

function mmdd(iso: string): number {
  const { mes, dia } = datas.partesDaData(iso);
  return mes * 100 + dia;
}

// ── Passos reutilizáveis ───────────────────────────────────────────────────

// Primeiro dia útil >= `iso`. Registra em `pulados` os dias descartados no caminho.
function primeiroDiaUtilAPartirDe(
  iso: string,
  calendario: Calendario,
  excluirFeriados: boolean,
  pulados?: DiaPulado[],
): string {
  let cursor = iso;
  let av = avaliarDia(cursor, calendario, excluirFeriados);
  while (!av.util) {
    if (pulados && av.motivo) pulados.push({ data: cursor, motivo: av.motivo });
    cursor = datas.somarDias(cursor, 1);
    av = avaliarDia(cursor, calendario, excluirFeriados);
  }
  return cursor;
}

// A partir de `dia1` (que já conta como o 1º dia útil), avança até somar `n`
// dias úteis. Devolve a data do n-ésimo dia útil.
function contarDiasUteisAPartirDe(
  dia1: string,
  n: number,
  calendario: Calendario,
  excluirFeriados: boolean,
  pulados?: DiaPulado[],
): string {
  let cursor = dia1;
  let contados = 1;
  while (contados < n) {
    cursor = datas.somarDias(cursor, 1);
    const av = avaliarDia(cursor, calendario, excluirFeriados);
    if (av.util) {
      contados++;
    } else if (pulados && av.motivo) {
      pulados.push({ data: cursor, motivo: av.motivo });
    }
  }
  return cursor;
}

// Volta `k` dias úteis a partir de `iso` (exclusive). Sempre cai em dia útil.
export function voltarDiasUteis(
  iso: string,
  k: number,
  calendario: Calendario,
  excluirFeriados: boolean,
): string {
  let cursor = iso;
  let restam = k;
  while (restam > 0) {
    cursor = datas.somarDias(cursor, -1);
    if (avaliarDia(cursor, calendario, excluirFeriados).util) {
      restam--;
    }
  }
  return cursor;
}

// Prazo interno a partir de um prazo fatal adotado (usado no recálculo após
// ajuste manual do fatal — caso T11).
export function prazoInternoAPartirDoFatal(
  prazoFatal: string,
  margem: number,
  calendario: Calendario,
  excluirFeriados: boolean,
): string {
  return voltarDiasUteis(prazoFatal, margem, calendario, excluirFeriados);
}

// ── Cálculo principal ──────────────────────────────────────────────────────
export function calcularPrazo(
  entrada: EntradaCalculoPrazo,
): ResultadoCalculoPrazo {
  const {
    natureza,
    dataInicial,
    dobro,
    excluirFeriados,
    margem,
    calendario,
    hoje,
  } = entrada;

  // 1. Prazo em dobro.
  const nInformado = Math.max(1, Math.trunc(entrada.dias));
  const n = dobro ? nInformado * 2 : nInformado;

  const diasPulados: DiaPulado[] = [];

  // 2. Dia 1 = a própria data inicial; se não for dia útil, o primeiro seguinte.
  const dia1 = primeiroDiaUtilAPartirDe(
    dataInicial,
    calendario,
    excluirFeriados,
    diasPulados,
  );

  // 3–4. Conta N dias úteis a partir do dia 1.
  const prazoFatalCalculado = contarDiasUteisAPartirDe(
    dia1,
    n,
    calendario,
    excluirFeriados,
    diasPulados,
  );

  // 5. Prazo interno = fatal − margem (dias úteis para trás).
  //    Borda: N − margem ≤ 0 → interno = max(dataInicial, hoje) + prazo apertado.
  let prazoInternoCalculado: string;
  let prazoApertado = false;
  if (n - margem <= 0) {
    prazoApertado = true;
    prazoInternoCalculado = datas.maiorData(dataInicial, hoje);
  } else {
    prazoInternoCalculado = voltarDiasUteis(
      prazoFatalCalculado,
      margem,
      calendario,
      excluirFeriados,
    );
  }

  // 6. Marcos do CPC (informativos; só fazem sentido para 'processual').
  const marcosCpc =
    natureza === "processual"
      ? calcularMarcosCpc(dataInicial, n, calendario, excluirFeriados)
      : null;

  // 7. Aviso de calendário incompleto.
  const avisoCalendarioIncompleto = avaliarAvisoCalendario(
    natureza,
    dataInicial,
    prazoFatalCalculado,
    calendario,
    excluirFeriados,
  );

  const memoriaCalculo: MemoriaCalculo = {
    natureza,
    dataInicial,
    nDias: n,
    nDiasInformado: nInformado,
    dobro,
    margem,
    dia1,
    diasPulados,
    prazoFatalCalculado,
    prazoInternoCalculado,
    prazoApertado,
    marcosCpc,
  };

  return {
    prazoFatalCalculado,
    prazoInternoCalculado,
    prazoApertado,
    avisoCalendarioIncompleto,
    memoriaCalculo,
  };
}

// ── Marcos do CPC (art. 224 §§2º–3º) — só para exibir na memória ────────────
function calcularMarcosCpc(
  disponibilizacao: string,
  n: number,
  calendario: Calendario,
  excluirFeriados: boolean,
): MarcosCpc {
  // §3º: considera-se dia da publicação o primeiro dia útil seguinte ao da
  // disponibilização. §2º: o prazo começa a correr no primeiro dia útil
  // seguinte à publicação, e exclui-se o dia do começo (art. 224 caput).
  const publicacaoCpc = primeiroDiaUtilAPartirDe(
    datas.somarDias(disponibilizacao, 1),
    calendario,
    excluirFeriados,
  );
  const inicioContagemCpc = primeiroDiaUtilAPartirDe(
    datas.somarDias(publicacaoCpc, 1),
    calendario,
    excluirFeriados,
  );
  const prazoFatalCpcEstrito = contarDiasUteisAPartirDe(
    inicioContagemCpc,
    n,
    calendario,
    excluirFeriados,
  );
  return {
    disponibilizacao,
    publicacaoCpc,
    inicioContagemCpc,
    prazoFatalCpcEstrito,
    observacao:
      "Opção A: o motor conta a disponibilização como dia 1 — mais conservador que o CPC art. 224 §§2º–3º. Estes marcos são informativos.",
  };
}

// ── Aviso de calendário incompleto (rede de segurança) ─────────────────────
function avaliarAvisoCalendario(
  natureza: "processual" | "interna",
  dataInicial: string,
  prazoFatal: string,
  calendario: Calendario,
  excluirFeriados: boolean,
): string | null {
  if (!excluirFeriados) {
    return null; // o usuário optou por ignorar feriados
  }

  // Escritório novo / tribunal sem nada cadastrado (plano §3.1): só vale a pena
  // avisar quando o prazo depende do calendário do tribunal (processual).
  if (
    natureza === "processual" &&
    calendario.feriados.length === 0 &&
    calendario.periodos.length === 0
  ) {
    return "Nenhum feriado cadastrado para este tribunal — o motor considerou só sábados e domingos. Confira o cálculo.";
  }

  // Calendário existe, mas o intervalo do cálculo cruza mais de um mês e não
  // tem NENHUM feriado/recesso nesse trecho — provável esquecimento.
  const meses = mesesNoIntervalo(dataInicial, prazoFatal);
  if (meses.length < 2) {
    return null;
  }
  const temAlgoNoIntervalo =
    calendario.feriados.some(
      (f) =>
        !f.repeteTodoAno &&
        datas.compararDatas(f.data, dataInicial) >= 0 &&
        datas.compararDatas(f.data, prazoFatal) <= 0,
    ) ||
    calendario.periodos.some(
      (p) =>
        !p.repeteTodoAno &&
        datas.compararDatas(p.dataFim, dataInicial) >= 0 &&
        datas.compararDatas(p.dataInicio, prazoFatal) <= 0,
    );
  if (temAlgoNoIntervalo) {
    return null;
  }
  const lista = meses.map((m) => datas.formatarMesAno(m)).join(", ");
  return `Sem feriados cadastrados no período do cálculo (${lista}) para este tribunal — confira.`;
}

function mesesNoIntervalo(inicio: string, fim: string): string[] {
  const meses: string[] = [];
  let cursor = inicio.slice(0, 7); // 'AAAA-MM'
  const ultimo = fim.slice(0, 7);
  while (cursor <= ultimo) {
    meses.push(cursor);
    const { ano, mes } = datas.partesDaData(cursor + "-01");
    cursor =
      mes === 12
        ? `${ano + 1}-01`
        : `${ano}-${String(mes + 1).padStart(2, "0")}`;
  }
  return meses;
}
