// Comportamento dos 3 tipos de atividade (prazo, compromisso, monitoramento).
// TypeScript puro (plano §3.6). É o que faz a agenda ser "inteligente":
// cada tipo aparece na hora certa e a prioridade é calculada, não gravada.

import * as datas from "./datas";

export type TipoAtividade = "prazo" | "compromisso" | "monitoramento";
export type StatusAtividade =
  | "pendente"
  | "em_andamento"
  | "concluida"
  | "cancelada";
export type Prioridade = "baixa" | "media" | "alta" | "urgente";

// Regras por tipo — constante, comentada (plano §3.6). NÃO vem do banco.
export const REGRAS_TIPO: Record<
  TipoAtividade,
  { persisteNaAgenda: boolean; diasAntesVisivelPadrao: number; podeRecorrer: boolean }
> = {
  // Prazo (Contestação, apelação…): fica na agenda até cumprir/vencer.
  prazo: { persisteNaAgenda: true, diasAntesVisivelPadrao: 0, podeRecorrer: false },
  // Compromisso (audiência, reunião…): aparece 5 dias antes.
  compromisso: {
    persisteNaAgenda: false,
    diasAntesVisivelPadrao: 5,
    podeRecorrer: true,
  },
  // Monitoramento (verificar publicação…): aparece só no dia.
  monitoramento: {
    persisteNaAgenda: false,
    diasAntesVisivelPadrao: 0,
    podeRecorrer: true,
  },
};

// ── Visibilidade na agenda ─────────────────────────────────────────────────
export type AtividadeParaVisibilidade = {
  tipo: TipoAtividade;
  status: StatusAtividade;
  data: string; // 'AAAA-MM-DD'
  diasAntesVisivelCustom: number | null;
};

// Uma atividade aparece na agenda do dia `dataAgenda`? (plano §3.6)
export function atividadeVisivelEm(
  atividade: AtividadeParaVisibilidade,
  dataAgenda: string,
): boolean {
  if (atividade.status === "concluida" || atividade.status === "cancelada") {
    return false;
  }
  const regras = REGRAS_TIPO[atividade.tipo];
  const aberta =
    atividade.status === "pendente" || atividade.status === "em_andamento";
  if (regras.persisteNaAgenda && aberta) {
    return true;
  }
  const diasAntes =
    atividade.diasAntesVisivelCustom ?? regras.diasAntesVisivelPadrao;
  const inicioJanela = datas.somarDias(atividade.data, -diasAntes);
  return (
    datas.compararDatas(dataAgenda, inicioJanela) >= 0 &&
    datas.compararDatas(dataAgenda, atividade.data) <= 0
  );
}

// ── Prioridade efetiva ─────────────────────────────────────────────────────
export type AtividadeParaPrioridade = {
  data: string; // 'AAAA-MM-DD'
  prioridadeManual: Prioridade;
};

// Calculada (não gravada). 4 níveis (plano §3.6):
//   atrasada / vence hoje / vence amanhã     → 'urgente'
//   vence em ≤ 5 dias úteis                  → 'alta'
//   senão                                    → prioridade manual
// Os "dias úteis" aqui ignoram feriados (só sáb/dom) — é um badge de triagem,
// não o cálculo do prazo. O estado "hora de fazer" da agenda usa prazo_interno.
export function prioridadeEfetiva(
  atividade: AtividadeParaPrioridade,
  hoje: string,
): Prioridade {
  const ateVencer = datas.compararDatas(atividade.data, hoje);
  if (ateVencer <= 0) {
    return "urgente"; // atrasada ou vence hoje
  }
  if (atividade.data === datas.somarDias(hoje, 1)) {
    return "urgente"; // vence amanhã
  }
  if (diasUteisEntre(hoje, atividade.data) <= 5) {
    return "alta";
  }
  return atividade.prioridadeManual;
}

// Dias úteis (só excluindo sáb/dom) depois de `de` até `ate` inclusive.
function diasUteisEntre(de: string, ate: string): number {
  let cursor = de;
  let uteis = 0;
  while (datas.compararDatas(cursor, ate) < 0) {
    cursor = datas.somarDias(cursor, 1);
    if (!datas.ehSabadoOuDomingo(cursor)) {
      uteis++;
    }
  }
  return uteis;
}

// ── Estado visual da agenda (plano §4 Bloco C.3 / TELAS.md) ─────────────────
export type EstadoAgenda =
  | "atrasada"
  | "vence_hoje"
  | "hora_de_fazer" // só prazo: hoje ≥ prazo_interno e ainda não venceu
  | "futura"
  | "concluida"
  | "cancelada";

export type AtividadeParaEstado = {
  status: StatusAtividade;
  data: string; // 'AAAA-MM-DD' (= prazo fatal, para prazo)
  prazoInterno: string | null; // só prazo
};

export function estadoNaAgenda(
  atividade: AtividadeParaEstado,
  hoje: string,
): EstadoAgenda {
  if (atividade.status === "concluida") return "concluida";
  if (atividade.status === "cancelada") return "cancelada";

  const ateVencer = datas.compararDatas(atividade.data, hoje);
  if (ateVencer < 0) return "atrasada";
  if (ateVencer === 0) return "vence_hoje";

  if (
    atividade.prazoInterno !== null &&
    datas.compararDatas(hoje, atividade.prazoInterno) >= 0
  ) {
    return "hora_de_fazer";
  }
  return "futura";
}
