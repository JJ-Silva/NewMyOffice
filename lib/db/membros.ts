// Acesso a dados: tabela `membro` (vínculo usuário ↔ escritório).
// Query Supabase visível, sem query builder dinâmico.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Papel } from "@/lib/domain/autorizacao";

export type Membro = {
  id: string;
  escritorio_id: string;
  papel: Papel;
  ativo: boolean;
};

export type MembroComEscritorio = Membro & {
  escritorio_nome: string;
};

// Os escritórios em que o usuário é membro ativo.
// Usado na tela "trocar de escritório" e logo após o cadastro/login.
export async function listarMembrosDoUsuario(
  supabase: SupabaseClient,
  usuarioId: string,
): Promise<MembroComEscritorio[]> {
  const { data, error } = await supabase
    .from("membro")
    .select("id, escritorio_id, papel, ativo, escritorio:escritorio_id (nome)")
    .eq("usuario_id", usuarioId)
    .eq("ativo", true)
    .is("deletado_em", null)
    .order("criado_em", { ascending: true });

  if (error) {
    throw new Error(`Falha ao listar escritórios do usuário: ${error.message}`);
  }

  return (data ?? []).map((linha) => ({
    id: linha.id as string,
    escritorio_id: linha.escritorio_id as string,
    papel: linha.papel as Papel,
    ativo: linha.ativo as boolean,
    // o join 1:1 pode vir como objeto ou array conforme a inferência do PostgREST
    escritorio_nome:
      (Array.isArray(linha.escritorio)
        ? linha.escritorio[0]?.nome
        : (linha.escritorio as { nome: string } | null)?.nome) ?? "(sem nome)",
  }));
}
