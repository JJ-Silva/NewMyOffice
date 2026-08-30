// Acesso a dados: `oab_monitorada` — as OABs dos advogados do escritório que a
// busca no DJEN usa. Um escritório tem quantas quiser (várias OAB por escritório).

import type { SupabaseClient } from "@supabase/supabase-js";

export type OabMonitorada = {
  id: string;
  numero: string;
  uf: string;
  nomeAdvogado: string | null;
  ativo: boolean;
};

export async function listarOabs(
  supabase: SupabaseClient,
  escritorioId: string,
): Promise<OabMonitorada[]> {
  const { data, error } = await supabase
    .from("oab_monitorada")
    .select("id, numero, uf, nome_advogado, ativo")
    .eq("escritorio_id", escritorioId)
    .is("deletado_em", null)
    .order("criado_em", { ascending: true });

  if (error) {
    throw new Error(`Falha ao listar OABs: ${error.message}`);
  }
  return (data ?? []).map((l) => ({
    id: l.id as string,
    numero: l.numero as string,
    uf: l.uf as string,
    nomeAdvogado: (l.nome_advogado as string | null) ?? null,
    ativo: l.ativo as boolean,
  }));
}

export async function adicionarOab(
  supabase: SupabaseClient,
  entrada: {
    escritorioId: string;
    numero: string;
    uf: string;
    nomeAdvogado: string | null;
  },
): Promise<void> {
  const { error } = await supabase.from("oab_monitorada").insert({
    escritorio_id: entrada.escritorioId,
    numero: entrada.numero.replace(/\D/g, ""),
    uf: entrada.uf.toUpperCase(),
    nome_advogado: entrada.nomeAdvogado,
  });
  if (error) {
    if (error.code === "23505") {
      throw new Error("Essa OAB já está cadastrada.");
    }
    throw new Error(`Falha ao adicionar a OAB: ${error.message}`);
  }
}

// Soft-delete (plano §0). As publicações já trazidas por essa OAB ficam.
export async function excluirOab(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("oab_monitorada")
    .update({ deletado_em: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    throw new Error(`Falha ao excluir a OAB: ${error.message}`);
  }
}
