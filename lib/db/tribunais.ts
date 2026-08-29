// Acesso a dados: tabela `tribunal` (órgãos onde o escritório atua —
// cada um tem seu calendário de feriados).
//
// Etapa 1: o formulário pede só nome + sigla (ver docs/prototipo/TELAS.md §4).
// esfera/uf ficam nulos por ora.

import type { SupabaseClient } from "@supabase/supabase-js";

export type Tribunal = {
  id: string;
  nome: string;
  sigla: string;
  ativo: boolean;
};

export async function listarTribunais(
  supabase: SupabaseClient,
  escritorioId: string,
): Promise<Tribunal[]> {
  const { data, error } = await supabase
    .from("tribunal")
    .select("id, nome, sigla, ativo")
    .eq("escritorio_id", escritorioId)
    .is("deletado_em", null)
    .order("sigla", { ascending: true });

  if (error) {
    throw new Error(`Falha ao listar tribunais: ${error.message}`);
  }
  return (data ?? []) as Tribunal[];
}

export async function criarTribunal(
  supabase: SupabaseClient,
  entrada: { escritorioId: string; nome: string; sigla: string },
): Promise<void> {
  const { error } = await supabase.from("tribunal").insert({
    escritorio_id: entrada.escritorioId,
    nome: entrada.nome,
    sigla: entrada.sigla,
  });

  if (error) {
    throw new Error(`Falha ao criar tribunal: ${error.message}`);
  }
}

// Soft-delete — dado jurídico não se apaga (plano §0). O motor filtra
// `deletado_em is null`, então prazos antigos que apontam esse tribunal
// continuam com a memória de cálculo intacta.
export async function excluirTribunal(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("tribunal")
    .update({ deletado_em: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw new Error(`Falha ao excluir tribunal: ${error.message}`);
  }
}
