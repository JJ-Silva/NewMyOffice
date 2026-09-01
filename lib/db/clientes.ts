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

export type PastaDoCliente = {
  id: string;
  codigo: string;
  nome: string | null;
  status: string;
};

export type ClienteDetalhe = Omit<Cliente, "qtd_pastas"> & {
  pastas: PastaDoCliente[];
};

export async function buscarCliente(
  supabase: SupabaseClient,
  escritorioId: string,
  id: string,
): Promise<ClienteDetalhe | null> {
  const { data, error } = await supabase
    .from("cliente")
    .select(
      `id, nome, cpf_cnpj, tipo_pessoa, telefone, email,
       pasta_cliente ( pasta:pasta_id ( id, codigo, nome, status, deletado_em ) )`,
    )
    .eq("escritorio_id", escritorioId)
    .eq("id", id)
    .is("deletado_em", null)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao buscar o cliente: ${error.message}`);
  }
  if (!data) return null;

  const vinculos = Array.isArray(data.pasta_cliente) ? data.pasta_cliente : [];
  const pastas: PastaDoCliente[] = [];
  for (const v of vinculos) {
    const p = (v as { pasta?: unknown }).pasta;
    const pasta = (Array.isArray(p) ? p[0] : p) as
      | {
          id: string;
          codigo: string;
          nome: string | null;
          status: string;
          deletado_em: string | null;
        }
      | undefined;
    if (pasta && pasta.deletado_em === null) {
      pastas.push({
        id: pasta.id,
        codigo: pasta.codigo,
        nome: pasta.nome ?? null,
        status: pasta.status,
      });
    }
  }
  pastas.sort((a, b) => b.codigo.localeCompare(a.codigo));

  return {
    id: data.id as string,
    nome: data.nome as string,
    cpf_cnpj: data.cpf_cnpj as string,
    tipo_pessoa: data.tipo_pessoa as TipoPessoa,
    telefone: (data.telefone as string | null) ?? null,
    email: (data.email as string | null) ?? null,
    pastas,
  };
}

export type NovoCliente = {
  escritorioId: string;
  nome: string;
  cpfCnpj: string;
  tipoPessoa: TipoPessoa;
  telefone: string | null;
  email: string | null;
};

export type CamposCliente = {
  nome: string;
  cpfCnpj: string;
  tipoPessoa: TipoPessoa;
  telefone: string | null;
  email: string | null;
};

export async function atualizarCliente(
  supabase: SupabaseClient,
  id: string,
  campos: CamposCliente,
): Promise<void> {
  if (!campos.nome.trim() || !campos.cpfCnpj.trim()) {
    throw new Error("Informe o nome e o CPF/CNPJ.");
  }
  const { error } = await supabase
    .from("cliente")
    .update({
      nome: campos.nome.trim(),
      cpf_cnpj: campos.cpfCnpj.trim(),
      tipo_pessoa: campos.tipoPessoa,
      telefone: campos.telefone,
      email: campos.email,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      throw new Error("Já existe outro cliente com esse CPF/CNPJ neste escritório.");
    }
    throw new Error(`Falha ao salvar o cliente: ${error.message}`);
  }
}

// Soft-delete. Bloqueia se o cliente ainda estiver em alguma pasta viva.
export async function excluirCliente(
  supabase: SupabaseClient,
  escritorioId: string,
  id: string,
): Promise<void> {
  const cliente = await buscarCliente(supabase, escritorioId, id);
  if (!cliente) {
    throw new Error("Cliente não encontrado.");
  }
  if (cliente.pastas.length > 0) {
    throw new Error(
      `Este cliente está em ${cliente.pastas.length} pasta${cliente.pastas.length === 1 ? "" : "s"}. Desvincule ou exclua essas pastas antes.`,
    );
  }
  const { error } = await supabase
    .from("cliente")
    .update({ deletado_em: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    throw new Error(`Falha ao excluir o cliente: ${error.message}`);
  }
}

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
