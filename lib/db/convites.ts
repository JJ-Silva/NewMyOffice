// Acesso a dados: `convite` (Etapa 6, Passo D).
// Criar/listar/cancelar exigem `membros.gerenciar` (RLS). Ver e aceitar passam
// por RPC `security definer` — quem aceita ainda não é membro.

import type { SupabaseClient } from "@supabase/supabase-js";

export type ConvitePendente = {
  id: string;
  email: string;
  rotuloId: string | null;
  rotuloNome: string | null;
  token: string;
  criadoEm: string;
  expiraEm: string;
};

export type DetalheConvite = {
  escritorioNome: string;
  rotuloNome: string | null;
  email: string;
  status: "pendente" | "aceito" | "cancelado";
  expirado: boolean;
};

export async function listarConvitesPendentes(
  supabase: SupabaseClient,
  escritorioId: string,
): Promise<ConvitePendente[]> {
  const { data, error } = await supabase
    .from("convite")
    .select("id, email, rotulo_id, token, criado_em, expira_em, rotulo:rotulo_id ( nome )")
    .eq("escritorio_id", escritorioId)
    .eq("status", "pendente")
    .order("criado_em", { ascending: false });

  if (error) {
    throw new Error(`Falha ao listar convites: ${error.message}`);
  }

  return (data ?? []).map((c) => ({
    id: c.id as string,
    email: c.email as string,
    rotuloId: (c.rotulo_id as string | null) ?? null,
    rotuloNome:
      (Array.isArray(c.rotulo)
        ? (c.rotulo[0] as { nome: string } | undefined)?.nome
        : (c.rotulo as { nome: string } | null)?.nome) ?? null,
    token: c.token as string,
    criadoEm: c.criado_em as string,
    expiraEm: c.expira_em as string,
  }));
}

export async function criarConvite(
  supabase: SupabaseClient,
  dados: {
    escritorioId: string;
    email: string;
    rotuloId: string | null;
    criadoPor: string;
  },
): Promise<{ id: string; token: string }> {
  const email = dados.email.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    throw new Error("Informe um e-mail válido.");
  }

  const token = crypto.randomUUID().replace(/-/g, "");

  const { data, error } = await supabase
    .from("convite")
    .insert({
      escritorio_id: dados.escritorioId,
      email,
      rotulo_id: dados.rotuloId,
      token,
      criado_por: dados.criadoPor,
    })
    .select("id, token")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Já existe um convite pendente para esse e-mail.");
    }
    throw new Error(`Falha ao criar o convite: ${error.message}`);
  }

  return { id: data.id as string, token: data.token as string };
}

export async function cancelarConvite(
  supabase: SupabaseClient,
  conviteId: string,
): Promise<void> {
  const { error } = await supabase
    .from("convite")
    .update({ status: "cancelado" })
    .eq("id", conviteId);
  if (error) {
    throw new Error(`Falha ao cancelar o convite: ${error.message}`);
  }
}

export async function verConvite(
  supabase: SupabaseClient,
  token: string,
): Promise<DetalheConvite | null> {
  const { data, error } = await supabase.rpc("ver_convite", { p_token: token });
  if (error) {
    throw new Error(`Falha ao ler o convite: ${error.message}`);
  }
  const linha = Array.isArray(data) ? data[0] : data;
  if (!linha) return null;
  return {
    escritorioNome: linha.escritorio_nome as string,
    rotuloNome: (linha.rotulo_nome as string | null) ?? null,
    email: linha.email as string,
    status: linha.status as DetalheConvite["status"],
    expirado: Boolean(linha.expirado),
  };
}

// Cria o membro. Retorna o id do escritório para gravar como escritório ativo.
export async function aceitarConvite(
  supabase: SupabaseClient,
  token: string,
): Promise<string> {
  const { data, error } = await supabase.rpc("aceitar_convite", {
    p_token: token,
  });
  if (error) {
    throw new Error(error.message);
  }
  return data as string;
}
