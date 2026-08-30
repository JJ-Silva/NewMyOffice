// Datas como texto 'AAAA-MM-DD'. Cálculo dia-a-dia via UTC para não sofrer
// com fuso horário (o resto do sistema nunca precisa de hora). Sem biblioteca
// externa de datas — o cálculo é dia a dia (plano §1.1).

const MS_POR_DIA = 24 * 60 * 60 * 1000;

const DIAS_DA_SEMANA_PT = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
];

const MESES_PT_CURTO = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

export type PartesData = { ano: number; mes: number; dia: number };

export function partesDaData(iso: string): PartesData {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return { ano, mes, dia };
}

function paraUTC(iso: string): number {
  const { ano, mes, dia } = partesDaData(iso);
  return Date.UTC(ano, mes - 1, dia);
}

function deUTC(ms: number): string {
  const d = new Date(ms);
  const ano = d.getUTCFullYear();
  const mes = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dia = String(d.getUTCDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export function somarDias(iso: string, n: number): string {
  return deUTC(paraUTC(iso) + n * MS_POR_DIA);
}

// Quantos dias tem o mês (1-12). Ex.: fev/2024 = 29, abr = 30.
export function diasNoMes(ano: number, mes: number): number {
  // O dia 0 do mês seguinte é o último dia deste mês.
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

// Soma `n` meses (pode ser negativo). Se o dia não existe no mês de destino
// (ex.: 31/jan + 1 mês), cai no último dia do mês (28/29/30). É a regra que a
// recorrência mensal usa ("todo dia 31" = último dia nos meses curtos).
export function somarMeses(iso: string, n: number): string {
  const { ano, mes, dia } = partesDaData(iso);
  const totalMeses = ano * 12 + (mes - 1) + n;
  const novoAno = Math.floor(totalMeses / 12);
  const novoMes = (totalMeses % 12) + 1; // 1-12
  const novoDia = Math.min(dia, diasNoMes(novoAno, novoMes));
  return `${novoAno}-${String(novoMes).padStart(2, "0")}-${String(
    novoDia,
  ).padStart(2, "0")}`;
}

// Negativo se a < b, zero se iguais, positivo se a > b.
export function compararDatas(a: string, b: string): number {
  return paraUTC(a) - paraUTC(b);
}

export function maiorData(a: string, b: string): string {
  return compararDatas(a, b) >= 0 ? a : b;
}

// 0 = domingo … 6 = sábado
export function diaDaSemana(iso: string): number {
  return new Date(paraUTC(iso)).getUTCDay();
}

export function ehSabadoOuDomingo(iso: string): boolean {
  const d = diaDaSemana(iso);
  return d === 0 || d === 6;
}

export function nomeDoDiaDaSemana(iso: string): string {
  return DIAS_DA_SEMANA_PT[diaDaSemana(iso)];
}

// '2026-03-24' → '24/03/2026'
export function formatarDataBR(iso: string): string {
  const { ano, mes, dia } = partesDaData(iso);
  return `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${ano}`;
}

// '2026-11' (ou uma data) → 'nov/2026'
export function formatarMesAno(anoOuIso: string): string {
  const { ano, mes } = partesDaData(
    anoOuIso.length === 7 ? anoOuIso + "-01" : anoOuIso,
  );
  return `${MESES_PT_CURTO[mes - 1]}/${ano}`;
}
