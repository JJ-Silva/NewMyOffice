// Grade do calendário (Etapa 3c) — só a matemática de "quais dias mostrar".
// TypeScript puro. A semana começa no domingo (padrão dos calendários no Brasil).

import * as datas from "./datas";

// Semanas que cobrem o mês inteiro, incluindo os dias de fora que completam a
// primeira e a última semana. Cada semana = 7 datas 'AAAA-MM-DD', domingo→sábado.
export function semanasDoMes(mes: string): string[][] {
  const primeiroDoMes = `${mes}-01`;
  const { ano, mes: m } = datas.partesDaData(primeiroDoMes);
  const ultimoDoMes = `${mes}-${String(datas.diasNoMes(ano, m)).padStart(2, "0")}`;

  // Recua até o domingo da primeira semana.
  let cursor = datas.somarDias(
    primeiroDoMes,
    -datas.diaDaSemana(primeiroDoMes),
  );

  const semanas: string[][] = [];
  while (datas.compararDatas(cursor, ultimoDoMes) <= 0) {
    const semana: string[] = [];
    for (let i = 0; i < 7; i++) {
      semana.push(cursor);
      cursor = datas.somarDias(cursor, 1);
    }
    semanas.push(semana);
  }
  return semanas;
}

// As 7 datas (domingo→sábado) da semana que contém `dia`.
export function semanaDe(dia: string): string[] {
  const domingo = datas.somarDias(dia, -datas.diaDaSemana(dia));
  return Array.from({ length: 7 }, (_, i) => datas.somarDias(domingo, i));
}

// 'AAAA-MM' do mês anterior / seguinte.
export function mesAnterior(mes: string): string {
  return datas.somarMeses(`${mes}-01`, -1).slice(0, 7);
}
export function mesSeguinte(mes: string): string {
  return datas.somarMeses(`${mes}-01`, 1).slice(0, 7);
}

// 'AAAA-MM' de uma data ('AAAA-MM-DD').
export function mesDaData(dia: string): string {
  return dia.slice(0, 7);
}

// O dia pertence ao mês de referência? (para esmaecer os dias "de fora")
export function ehDoMes(dia: string, mes: string): boolean {
  return mesDaData(dia) === mes;
}
