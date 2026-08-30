// Acesso a dados: `parte` (§3.5, Etapa 2). Partes vinculadas a um processo.

import type { SupabaseClient } from "@supabase/supabase-js";

export type TipoParte =
  | "autor"
  | "reu"
  | "litisconsorte"
  | "terceiro"
  | "assistente"
  | "interessado";

export const TIPOS_PARTE: { valor: TipoParte; label: string }[] = [
  { valor: "autor", label: "Autor / requerente" },
  { valor: "reu", label: "Réu / requerido" },
  { valor: "litisconsorte", label: "Litisconsorte" },
  { valor: "terceiro", label: "Terceiro" },
  { valor: "assistente", label: "Assistente" },
  { valor: "interessado", label: "Interessado" },
];

export type Parte = {
  id: string;
  nome: string;
  tipo_parte: TipoParte;
  cpf_cnpj: string | null;
  advogado_adverso: string | null;
  oab_adverso: string | null;
};

export async function listarPartesDoProcesso(
  supabase: SupabaseClient,
  processoId: string,
): Promise<Parte[]> {
  const { data, error } = await supabase
    .from("parte")
    .select("id, nome, tipo_parte, cpf_cnpj, advogado_adverso, oab_adverso")
    .eq("processo_id", processoId)
    .is("deletado_em", null)
    .order("criado_em", { ascending: true });

  if (error) {
    throw new Error(`Falha ao listar partes: ${error.message}`);
  }
  return (data ?? []) as Parte[];
}

export async function adicionarParte(
  supabase: SupabaseClient,
  args: {
    escritorioId: string;
    processoId: string;
    nome: string;
    tipoParte: TipoParte;
    cpfCnpj: string | null;
    advogadoAdverso: string | null;
    oabAdverso: string | null;
  },
): Promise<void> {
  const { error } = await supabase.from("parte").insert({
    escritorio_id: args.escritorioId,
    processo_id: args.processoId,
    nome: args.nome,
    tipo_parte: args.tipoParte,
    cpf_cnpj: args.cpfCnpj,
    advogado_adverso: args.advogadoAdverso,
    oab_adverso: args.oabAdverso,
  });
  if (error) {
    throw new Error(`Falha ao adicionar a parte: ${error.message}`);
  }
}

export async function removerParte(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("parte")
    .update({ deletado_em: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    throw new Error(`Falha ao remover a parte: ${error.message}`);
  }
}
