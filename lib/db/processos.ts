// Acesso a dados: `processo` (base — §3.5). Na Etapa 1 quase sempre só existe
// o 'geral' (criado por trigger junto com a pasta). Judicial/administrativo
// entram na Etapa 2.

import type { SupabaseClient } from "@supabase/supabase-js";

export type ProcessoResumo = {
  id: string;
  tipo: "geral" | "judicial" | "administrativo";
  numero: string | null;
};

export async function listarProcessosDaPasta(
  supabase: SupabaseClient,
  pastaId: string,
): Promise<ProcessoResumo[]> {
  const { data, error } = await supabase
    .from("processo")
    .select("id, tipo, numero")
    .eq("pasta_id", pastaId)
    .is("deletado_em", null)
    // o 'geral' primeiro
    .order("tipo", { ascending: true });

  if (error) {
    throw new Error(`Falha ao listar processos da pasta: ${error.message}`);
  }
  return (data ?? []) as ProcessoResumo[];
}
