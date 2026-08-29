// Acesso a dados: catálogo `area` (§3.2). Copiado por escritório no onboarding;
// aqui só listamos para os selects de pasta.

import type { SupabaseClient } from "@supabase/supabase-js";

export type Area = { id: string; nome: string };

export async function listarAreas(
  supabase: SupabaseClient,
  escritorioId: string,
): Promise<Area[]> {
  const { data, error } = await supabase
    .from("area")
    .select("id, nome")
    .eq("escritorio_id", escritorioId)
    .eq("ativo", true)
    .is("deletado_em", null)
    .order("ordem", { ascending: true });

  if (error) {
    throw new Error(`Falha ao listar áreas: ${error.message}`);
  }
  return (data ?? []) as Area[];
}
