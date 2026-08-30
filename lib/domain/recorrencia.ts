// Motor de recorrência (Etapa 3a). TypeScript puro — sem Supabase, sem React.
//
// Só compromisso e monitoramento recorrem (plano §3.6 — prazo NUNCA recorre).
// Aqui está apenas a REGRA e a geração das datas de ocorrência. O que faz com
// essas datas (criar as `atividade` no banco) é o `lib/db/recorrencias.ts`.
//
// 3 padrões de repetição:
//   - intervalo : "a cada N dias | semanas | meses" a partir da data-base
//   - semanal   : "toda semana nos dias X" (0=domingo … 6=sábado)
//   - mensal    : "todo dia D do mês" (D fora do mês → último dia do mês)
//
// 3 formas de terminar:
//   - data       : repete até uma data (inclusive)
//   - ocorrencias: repete um número fixo de vezes
//   - indefinido : repete sem fim (o motor só gera dentro de um horizonte)

import * as datas from "./datas";

// Quantos dias à frente de "hoje" a agenda materializa as ocorrências futuras.
// A janela padrão da agenda é 30 dias (configuracao_escritorio.agenda_janela_dias);
// 90 dá folga para o usuário ver o que vem e para a materialização não rodar
// toda hora. Recorrências muito espaçadas (ex.: "a cada 6 meses") dependem do
// "gera a próxima ao concluir" para não sumирem — ver lib/db/recorrencias.ts.
export const HORIZONTE_MATERIALIZACAO_DIAS = 90;

// Trava de segurança: nenhuma regra gera mais que isto de uma vez (evita laço
// infinito se uma regra vier malformada).
const MAX_OCORRENCIAS = 500;

export type Periodicidade =
  | { tipo: "intervalo"; cada: number; unidade: "dias" | "semanas" | "meses" }
  | { tipo: "semanal"; diasDaSemana: number[] } // 0=domingo … 6=sábado
  | { tipo: "mensal"; diaDoMes: number }; // 1..31

export type Termino =
  | { tipo: "data"; ate: string } // 'AAAA-MM-DD' inclusive
  | { tipo: "ocorrencias"; total: number }
  | { tipo: "indefinido" };

export type RegraRecorrencia = {
  dataBase: string; // 'AAAA-MM-DD' — âncora / primeira data candidata
  periodicidade: Periodicidade;
  termino: Termino;
};

// ── Validação (usada antes de gravar) ─────────────────────────────────────────
export function validarRegra(
  regra: RegraRecorrencia,
): { ok: true } | { ok: false; erro: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(regra.dataBase)) {
    return { ok: false, erro: "Data-base inválida." };
  }

  const p = regra.periodicidade;
  if (p.tipo === "intervalo") {
    if (!Number.isInteger(p.cada) || p.cada < 1) {
      return { ok: false, erro: "O intervalo tem de ser pelo menos 1." };
    }
  } else if (p.tipo === "semanal") {
    if (p.diasDaSemana.length === 0) {
      return { ok: false, erro: "Escolha pelo menos um dia da semana." };
    }
    if (p.diasDaSemana.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) {
      return { ok: false, erro: "Dia da semana inválido." };
    }
  } else if (p.tipo === "mensal") {
    if (!Number.isInteger(p.diaDoMes) || p.diaDoMes < 1 || p.diaDoMes > 31) {
      return { ok: false, erro: "O dia do mês tem de ser entre 1 e 31." };
    }
  }

  const t = regra.termino;
  if (t.tipo === "data") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(t.ate)) {
      return { ok: false, erro: "Data-limite inválida." };
    }
    if (datas.compararDatas(t.ate, regra.dataBase) < 0) {
      return { ok: false, erro: "A data-limite é anterior à data-base." };
    }
  } else if (t.tipo === "ocorrencias") {
    if (!Number.isInteger(t.total) || t.total < 1) {
      return { ok: false, erro: "O número de ocorrências tem de ser pelo menos 1." };
    }
  }

  return { ok: true };
}

// ── Descrição legível (para telas e para a memória) ───────────────────────────
const DIAS_CURTOS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export function descreverRegra(regra: RegraRecorrencia): string {
  const p = regra.periodicidade;
  let base: string;
  if (p.tipo === "intervalo") {
    base =
      p.cada === 1
        ? { dias: "Todo dia", semanas: "Toda semana", meses: "Todo mês" }[
            p.unidade
          ]
        : `A cada ${p.cada} ${p.unidade}`;
  } else if (p.tipo === "semanal") {
    const ordenados = [...p.diasDaSemana].sort((a, b) => a - b);
    base = `Toda semana: ${ordenados.map((d) => DIAS_CURTOS[d]).join(", ")}`;
  } else {
    base = `Todo dia ${p.diaDoMes} do mês`;
  }

  const t = regra.termino;
  if (t.tipo === "data") {
    return `${base} · até ${datas.formatarDataBR(t.ate)}`;
  }
  if (t.tipo === "ocorrencias") {
    return `${base} · ${t.total} ${t.total === 1 ? "vez" : "vezes"}`;
  }
  return base;
}

// ── Geração das datas de ocorrência ──────────────────────────────────────────
//
// Devolve todas as datas de ocorrência da regra, da `dataBase` até `limite`
// (inclusive), já aplicando o término por DATA e por NÚMERO DE OCORRÊNCIAS.
// Ordem crescente, sem repetição. Não sabe o que já existe no banco — para
// isso use `ocorrenciasFaltantes`.
export function ocorrenciasAte(
  regra: RegraRecorrencia,
  limite: string,
): string[] {
  const resultado: string[] = [];
  const limiteEfetivo =
    regra.termino.tipo === "data"
      ? menorData(limite, regra.termino.ate)
      : limite;
  const teto =
    regra.termino.tipo === "ocorrencias"
      ? Math.min(regra.termino.total, MAX_OCORRENCIAS)
      : MAX_OCORRENCIAS;

  for (const data of gerarCandidatas(regra)) {
    if (datas.compararDatas(data, limiteEfetivo) > 0) break;
    if (datas.compararDatas(data, regra.dataBase) < 0) continue;
    resultado.push(data);
    if (resultado.length >= teto) break;
  }
  return resultado;
}

// A primeira ocorrência da série (ou null se a série já terminou — só possível
// com término por ocorrências = 0, que a validação barra, mas fica defensivo).
export function primeiraOcorrencia(regra: RegraRecorrencia): string | null {
  for (const data of gerarCandidatas(regra)) {
    if (datas.compararDatas(data, regra.dataBase) < 0) continue;
    if (regra.termino.tipo === "data" && datas.compararDatas(data, regra.termino.ate) > 0) {
      return null;
    }
    if (regra.termino.tipo === "ocorrencias" && regra.termino.total < 1) {
      return null;
    }
    return data;
  }
  return null;
}

// A próxima ocorrência estritamente depois de `data` (respeitando o término),
// ou null se não há. Usado pelo "gera a próxima ao concluir".
export function proximaOcorrenciaApos(
  regra: RegraRecorrencia,
  data: string,
): string | null {
  let vistas = 0;
  for (const candidata of gerarCandidatas(regra)) {
    if (datas.compararDatas(candidata, regra.dataBase) < 0) continue;
    vistas++;
    if (regra.termino.tipo === "ocorrencias" && vistas > regra.termino.total) {
      return null;
    }
    if (
      regra.termino.tipo === "data" &&
      datas.compararDatas(candidata, regra.termino.ate) > 0
    ) {
      return null;
    }
    if (datas.compararDatas(candidata, data) > 0) {
      return candidata;
    }
  }
  return null;
}

// Dadas as datas que JÁ existem no banco para esta série (incluindo as
// excluídas — uma ocorrência apagada não deve voltar), devolve as datas que
// ainda faltam criar, até `limite`.
export function ocorrenciasFaltantes(
  regra: RegraRecorrencia,
  jaExistentes: string[],
  limite: string,
): string[] {
  const existentes = new Set(jaExistentes);
  return ocorrenciasAte(regra, limite).filter((d) => !existentes.has(d));
}

// ── Gerador base — sequência infinita e preguiçosa de datas candidatas ───────
// Cada padrão avança do seu jeito; a poda (limite, término) fica em quem chama.
function* gerarCandidatas(regra: RegraRecorrencia): Generator<string> {
  const p = regra.periodicidade;

  if (p.tipo === "intervalo") {
    let passo = 0;
    while (passo < MAX_OCORRENCIAS) {
      if (p.unidade === "dias") {
        yield datas.somarDias(regra.dataBase, passo * p.cada);
      } else if (p.unidade === "semanas") {
        yield datas.somarDias(regra.dataBase, passo * p.cada * 7);
      } else {
        yield datas.somarMeses(regra.dataBase, passo * p.cada);
      }
      passo++;
    }
    return;
  }

  if (p.tipo === "semanal") {
    // Varre dia a dia a partir da data-base; emite os que caem num dia marcado.
    const marcados = new Set(p.diasDaSemana);
    let cursor = regra.dataBase;
    let emitidas = 0;
    let diasVaridos = 0;
    // teto de dias varridos: MAX_OCORRENCIAS semanas
    while (emitidas < MAX_OCORRENCIAS && diasVaridos < MAX_OCORRENCIAS * 7) {
      if (marcados.has(datas.diaDaSemana(cursor))) {
        yield cursor;
        emitidas++;
      }
      cursor = datas.somarDias(cursor, 1);
      diasVaridos++;
    }
    return;
  }

  // mensal: dia D de cada mês, a partir do mês da data-base.
  let mes = 0;
  while (mes < MAX_OCORRENCIAS) {
    const alvo = datas.somarMeses(
      primeiroDiaDoMes(regra.dataBase),
      mes,
    );
    const { ano, mes: m } = datas.partesDaData(alvo);
    const dia = Math.min(p.diaDoMes, datas.diasNoMes(ano, m));
    yield `${ano}-${String(m).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    mes++;
  }
}

function primeiroDiaDoMes(iso: string): string {
  const { ano, mes } = datas.partesDaData(iso);
  return `${ano}-${String(mes).padStart(2, "0")}-01`;
}

function menorData(a: string, b: string): string {
  return datas.compararDatas(a, b) <= 0 ? a : b;
}
