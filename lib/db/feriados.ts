// Acesso a dados: `feriado` + `feriado_tribunal` (N:N).
//
// Cada feriado (data + descrição) diz em QUAIS tribunais não há expediente.
// Sem seed — o autor cadastra tudo aqui, inclusive os nacionais (25/12 etc.),
// Carnaval, Corpus Christi... (decisão P3b/c do plano).

import type { SupabaseClient } from "@supabase/supabase-js";

export type Feriado = {
  id: string;
  data: string; // ISO 'AAAA-MM-DD'
  descricao: string;
  repete_todo_ano: boolean;
  tribunais: { id: string; sigla: string }[];
};

export async function listarFeriados(
  supabase: SupabaseClient,
  escritorioId: string,
): Promise<Feriado[]> {
  const { data, error } = await supabase
    .from("feriado")
    .select(
      "id, data, descricao, repete_todo_ano, feriado_tribunal ( tribunal:tribunal_id ( id, sigla, deletado_em ) )",
    )
    .eq("escritorio_id", escritorioId)
    .is("deletado_em", null)
    .order("data", { ascending: true });

  if (error) {
    throw new Error(`Falha ao listar feriados: ${error.message}`);
  }

  return (data ?? []).map((linha) => ({
    id: linha.id as string,
    data: linha.data as string,
    descricao: linha.descricao as string,
    repete_todo_ano: linha.repete_todo_ano as boolean,
    tribunais: tribunaisVinculados(linha.feriado_tribunal),
  }));
}

// O join N:N volta como lista de { tribunal: {...} }. Mantém só os tribunais
// não excluídos (soft-delete) e devolve id + sigla.
export function tribunaisVinculados(
  vinculos: unknown,
): { id: string; sigla: string }[] {
  if (!Array.isArray(vinculos)) {
    return [];
  }
  return vinculos
    .map((v) => (v as { tribunal?: unknown }).tribunal)
    .map((t) => (Array.isArray(t) ? t[0] : t))
    .filter(
      (t): t is { id: string; sigla: string; deletado_em: string | null } =>
        Boolean(t) && typeof t === "object",
    )
    .filter((t) => t.deletado_em === null)
    .map((t) => ({ id: t.id, sigla: t.sigla }));
}

export async function criarFeriado(
  supabase: SupabaseClient,
  entrada: {
    escritorioId: string;
    data: string;
    descricao: string;
    repeteTodoAno: boolean;
    tribunalIds: string[];
  },
): Promise<void> {
  const { data: criado, error } = await supabase
    .from("feriado")
    .insert({
      escritorio_id: entrada.escritorioId,
      data: entrada.data,
      descricao: entrada.descricao,
      repete_todo_ano: entrada.repeteTodoAno,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Falha ao criar feriado: ${error.message}`);
  }

  if (entrada.tribunalIds.length > 0) {
    const vinculos = entrada.tribunalIds.map((tribunalId) => ({
      feriado_id: criado.id as string,
      tribunal_id: tribunalId,
    }));
    const { error: erroVinculo } = await supabase
      .from("feriado_tribunal")
      .insert(vinculos);
    if (erroVinculo) {
      throw new Error(
        `Feriado criado, mas falhou ao vincular tribunais: ${erroVinculo.message}`,
      );
    }
  }
}

export async function excluirFeriado(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("feriado")
    .update({ deletado_em: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw new Error(`Falha ao excluir feriado: ${error.message}`);
  }
}
