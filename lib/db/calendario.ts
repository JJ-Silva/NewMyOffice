// Monta o `Calendario` que o motor de prazo (lib/domain/prazo.ts) consome, a
// partir dos feriados e períodos não úteis vinculados a UM tribunal.
//
// Sem tribunal (prazo `interna` sem tribunal): devolve calendário vazio — o
// motor pula só sábado e domingo.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Calendario } from "@/lib/domain/prazo";
import { CALENDARIO_VAZIO } from "@/lib/domain/prazo";

export async function carregarCalendarioDoTribunal(
  supabase: SupabaseClient,
  escritorioId: string,
  tribunalId: string | null,
): Promise<Calendario> {
  if (!tribunalId) {
    return CALENDARIO_VAZIO;
  }

  const [feriadosRes, periodosRes] = await Promise.all([
    supabase
      .from("feriado")
      .select("data, descricao, repete_todo_ano, feriado_tribunal!inner(tribunal_id)")
      .eq("escritorio_id", escritorioId)
      .eq("feriado_tribunal.tribunal_id", tribunalId)
      .is("deletado_em", null),
    supabase
      .from("periodo_nao_util")
      .select(
        "data_inicio, data_fim, descricao, repete_todo_ano, periodo_nao_util_tribunal!inner(tribunal_id)",
      )
      .eq("escritorio_id", escritorioId)
      .eq("periodo_nao_util_tribunal.tribunal_id", tribunalId)
      .is("deletado_em", null),
  ]);

  if (feriadosRes.error) {
    throw new Error(`Falha ao carregar feriados: ${feriadosRes.error.message}`);
  }
  if (periodosRes.error) {
    throw new Error(
      `Falha ao carregar períodos não úteis: ${periodosRes.error.message}`,
    );
  }

  return {
    feriados: (feriadosRes.data ?? []).map((f) => ({
      data: f.data as string,
      descricao: f.descricao as string,
      repeteTodoAno: f.repete_todo_ano as boolean,
    })),
    periodos: (periodosRes.data ?? []).map((p) => ({
      dataInicio: p.data_inicio as string,
      dataFim: p.data_fim as string,
      descricao: p.descricao as string,
      repeteTodoAno: p.repete_todo_ano as boolean,
    })),
  };
}
