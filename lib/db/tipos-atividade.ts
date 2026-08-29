// Acesso a dados: catálogo `tipo_atividade` (§3.6). Copiado por escritório no
// onboarding. Para aplica_a='prazo', os campos dias_padrao/natureza são o ponto
// de partida da configuracao_contagem do prazo lançado.

import type { SupabaseClient } from "@supabase/supabase-js";

export type NaturezaPrazo = "processual" | "material" | "interna";

export type TipoAtividadeCatalogo = {
  id: string;
  nome: string;
  aplica_a: "prazo" | "compromisso" | "monitoramento";
  dias_padrao: number | null;
  natureza: NaturezaPrazo | null;
  exige_peca: boolean;
};

export async function listarTiposDeAtividade(
  supabase: SupabaseClient,
  escritorioId: string,
  aplicaA: TipoAtividadeCatalogo["aplica_a"],
): Promise<TipoAtividadeCatalogo[]> {
  const { data, error } = await supabase
    .from("tipo_atividade")
    .select("id, nome, aplica_a, dias_padrao, natureza, exige_peca")
    .eq("escritorio_id", escritorioId)
    .eq("aplica_a", aplicaA)
    .eq("ativo", true)
    .is("deletado_em", null)
    .order("nome", { ascending: true });

  if (error) {
    throw new Error(`Falha ao listar tipos de atividade: ${error.message}`);
  }
  return (data ?? []) as TipoAtividadeCatalogo[];
}

export async function buscarTipoDeAtividade(
  supabase: SupabaseClient,
  id: string,
): Promise<TipoAtividadeCatalogo | null> {
  const { data, error } = await supabase
    .from("tipo_atividade")
    .select("id, nome, aplica_a, dias_padrao, natureza, exige_peca")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao buscar o tipo de atividade: ${error.message}`);
  }
  return (data as TipoAtividadeCatalogo | null) ?? null;
}
