// Acesso a dados: `periodo_nao_util` + `periodo_nao_util_tribunal` (N:N).
//
// Intervalos sem expediente — o recesso forense (CPC art. 220, 20/12 a 20/01)
// e afins. Também 100% manual e por tribunal (decisão P12 do plano).

import type { SupabaseClient } from "@supabase/supabase-js";
import { tribunaisVinculados } from "@/lib/db/feriados";

export type PeriodoNaoUtil = {
  id: string;
  data_inicio: string;
  data_fim: string;
  descricao: string;
  repete_todo_ano: boolean;
  tribunais: { id: string; sigla: string }[];
};

export async function listarPeriodosNaoUteis(
  supabase: SupabaseClient,
  escritorioId: string,
): Promise<PeriodoNaoUtil[]> {
  const { data, error } = await supabase
    .from("periodo_nao_util")
    .select(
      "id, data_inicio, data_fim, descricao, repete_todo_ano, periodo_nao_util_tribunal ( tribunal:tribunal_id ( id, sigla, deletado_em ) )",
    )
    .eq("escritorio_id", escritorioId)
    .is("deletado_em", null)
    .order("data_inicio", { ascending: true });

  if (error) {
    throw new Error(`Falha ao listar períodos não úteis: ${error.message}`);
  }

  return (data ?? []).map((linha) => ({
    id: linha.id as string,
    data_inicio: linha.data_inicio as string,
    data_fim: linha.data_fim as string,
    descricao: linha.descricao as string,
    repete_todo_ano: linha.repete_todo_ano as boolean,
    tribunais: tribunaisVinculados(linha.periodo_nao_util_tribunal),
  }));
}

export async function criarPeriodoNaoUtil(
  supabase: SupabaseClient,
  entrada: {
    escritorioId: string;
    dataInicio: string;
    dataFim: string;
    descricao: string;
    repeteTodoAno: boolean;
    tribunalIds: string[];
  },
): Promise<void> {
  const { data: criado, error } = await supabase
    .from("periodo_nao_util")
    .insert({
      escritorio_id: entrada.escritorioId,
      data_inicio: entrada.dataInicio,
      data_fim: entrada.dataFim,
      descricao: entrada.descricao,
      repete_todo_ano: entrada.repeteTodoAno,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Falha ao criar período não útil: ${error.message}`);
  }

  if (entrada.tribunalIds.length > 0) {
    const vinculos = entrada.tribunalIds.map((tribunalId) => ({
      periodo_id: criado.id as string,
      tribunal_id: tribunalId,
    }));
    const { error: erroVinculo } = await supabase
      .from("periodo_nao_util_tribunal")
      .insert(vinculos);
    if (erroVinculo) {
      throw new Error(
        `Período criado, mas falhou ao vincular tribunais: ${erroVinculo.message}`,
      );
    }
  }
}

export async function excluirPeriodoNaoUtil(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("periodo_nao_util")
    .update({ deletado_em: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw new Error(`Falha ao excluir período não útil: ${error.message}`);
  }
}
