// Acesso a dados: tabela `cliente` (§3.3). cpf_cnpj é obrigatório e único por
// escritório (índice parcial, ignora os soft-deletados).

import type { SupabaseClient } from "@supabase/supabase-js";

export type TipoPessoa = "fisica" | "juridica";

export type Cliente = {
  id: string;
  nome: string;
  cpf_cnpj: string;
  tipo_pessoa: TipoPessoa;
  telefone: string | null;
  email: string | null;
  qtd_pastas: number;
};

export async function listarClientes(
  supabase: SupabaseClient,
  escritorioId: string,
): Promise<Cliente[]> {
  const { data, error } = await supabase
    .from("cliente")
    .select(
      "id, nome, cpf_cnpj, tipo_pessoa, telefone, email, pasta_cliente ( pasta:pasta_id ( deletado_em ) )",
    )
    .eq("escritorio_id", escritorioId)
    .is("deletado_em", null)
    .order("nome", { ascending: true });

  if (error) {
    throw new Error(`Falha ao listar clientes: ${error.message}`);
  }

  return (data ?? []).map((linha) => ({
    id: linha.id as string,
    nome: linha.nome as string,
    cpf_cnpj: linha.cpf_cnpj as string,
    tipo_pessoa: linha.tipo_pessoa as TipoPessoa,
    telefone: (linha.telefone as string | null) ?? null,
    email: (linha.email as string | null) ?? null,
    qtd_pastas: contarPastasVivas(linha.pasta_cliente),
  }));
}

function contarPastasVivas(vinculos: unknown): number {
  if (!Array.isArray(vinculos)) return 0;
  return vinculos.filter((v) => {
    const p = (v as { pasta?: unknown }).pasta;
    const pasta = Array.isArray(p) ? p[0] : p;
    return pasta && (pasta as { deletado_em: string | null }).deletado_em === null;
  }).length;
}

export type NovoCliente = {
  escritorioId: string;
  nome: string;
  cpfCnpj: string;
  tipoPessoa: TipoPessoa;
  telefone: string | null;
  email: string | null;
};

// Retorna o id do cliente criado.
export async function criarCliente(
  supabase: SupabaseClient,
  entrada: NovoCliente,
): Promise<string> {
  const { data, error } = await supabase
    .from("cliente")
    .insert({
      escritorio_id: entrada.escritorioId,
      nome: entrada.nome,
      cpf_cnpj: entrada.cpfCnpj,
      tipo_pessoa: entrada.tipoPessoa,
      telefone: entrada.telefone,
      email: entrada.email,
    })
    .select("id")
    .single();

  if (error) {
    // 23505 = unique_violation (cpf_cnpj já cadastrado neste escritório)
    if (error.code === "23505") {
      throw new Error("Já existe um cliente com esse CPF/CNPJ neste escritório.");
    }
    throw new Error(`Falha ao criar cliente: ${error.message}`);
  }

  return data.id as string;
}
