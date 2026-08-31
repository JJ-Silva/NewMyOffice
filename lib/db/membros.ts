// Acesso a dados: tabela `membro` (vínculo usuário ↔ escritório) e a
// resolução das permissões (rótulo + overrides) — Etapa 6.
// Query Supabase visível, sem query builder dinâmico.

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type ContextoAutorizacao,
  permissoesEfetivas,
} from "@/lib/domain/autorizacao";
import { ehPermissao, type Permissao } from "@/lib/domain/permissoes";

export type Membro = {
  id: string;
  escritorio_id: string;
  ativo: boolean;
  fundador: boolean;
  rotulo_id: string | null;
  rotulo_nome: string | null;
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
    .select(
      `id, escritorio_id, ativo, fundador, rotulo_id,
       escritorio:escritorio_id (nome),
       rotulo:rotulo_id (nome)`,
    )
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
    ativo: linha.ativo as boolean,
    fundador: Boolean(linha.fundador),
    rotulo_id: (linha.rotulo_id as string | null) ?? null,
    escritorio_nome: um<{ nome: string }>(linha.escritorio)?.nome ?? "(sem nome)",
    rotulo_nome: um<{ nome: string }>(linha.rotulo)?.nome ?? null,
  }));
}

// As permissões efetivas de um membro (rótulo + overrides), já resolvidas.
// Chamada uma vez por request, ao montar a sessão.
export async function carregarPermissoesDoMembro(
  supabase: SupabaseClient,
  membro: Pick<Membro, "id" | "ativo" | "fundador" | "rotulo_id">,
): Promise<Set<Permissao>> {
  const ctx = await carregarContextoAutorizacao(supabase, membro);
  return permissoesEfetivas(ctx);
}

export async function carregarContextoAutorizacao(
  supabase: SupabaseClient,
  membro: Pick<Membro, "id" | "ativo" | "fundador" | "rotulo_id">,
): Promise<ContextoAutorizacao> {
  // Fundador passa por cima de tudo — nem precisa ler as permissões.
  if (membro.fundador) {
    return {
      ativo: membro.ativo,
      fundador: true,
      permissoesDoRotulo: new Set(),
      overrides: new Map(),
    };
  }

  const [permsRotulo, overrides] = await Promise.all([
    membro.rotulo_id
      ? supabase
          .from("rotulo_permissao")
          .select("permissao")
          .eq("rotulo_id", membro.rotulo_id)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("membro_permissao")
      .select("permissao, concedida")
      .eq("membro_id", membro.id),
  ]);

  if (permsRotulo.error) {
    throw new Error(
      `Falha ao ler as permissões do rótulo: ${permsRotulo.error.message}`,
    );
  }
  if (overrides.error) {
    throw new Error(
      `Falha ao ler os ajustes de permissão do membro: ${overrides.error.message}`,
    );
  }

  const permissoesDoRotulo = new Set<Permissao>();
  for (const linha of permsRotulo.data ?? []) {
    const p = linha.permissao as string;
    if (ehPermissao(p)) permissoesDoRotulo.add(p);
  }

  const mapaOverrides = new Map<Permissao, boolean>();
  for (const linha of overrides.data ?? []) {
    const p = linha.permissao as string;
    if (ehPermissao(p)) mapaOverrides.set(p, Boolean(linha.concedida));
  }

  return {
    ativo: membro.ativo,
    fundador: false,
    permissoesDoRotulo,
    overrides: mapaOverrides,
  };
}

// ── Gestão da equipe (Configurações → Time) — Etapa 6 ───────────────────────

export type OverrideMembro = {
  permissao: Permissao;
  concedida: boolean;
};

export type MembroDaEquipe = {
  id: string;
  usuarioNome: string;
  usuarioEmail: string;
  ativo: boolean;
  fundador: boolean;
  rotuloId: string | null;
  overrides: OverrideMembro[];
  ehVoce: boolean;
};

export async function listarEquipe(
  supabase: SupabaseClient,
  escritorioId: string,
  usuarioAtualId: string,
): Promise<MembroDaEquipe[]> {
  const { data, error } = await supabase
    .from("membro")
    .select(
      `id, ativo, fundador, rotulo_id, usuario_id,
       usuario:usuario_id ( nome, email ),
       membro_permissao ( permissao, concedida )`,
    )
    .eq("escritorio_id", escritorioId)
    .is("deletado_em", null)
    .order("criado_em", { ascending: true });

  if (error) {
    throw new Error(`Falha ao listar a equipe: ${error.message}`);
  }

  return (data ?? []).map((m) => {
    const u = um<{ nome: string; email: string }>(m.usuario);
    const overrides: OverrideMembro[] = [];
    for (const o of Array.isArray(m.membro_permissao) ? m.membro_permissao : []) {
      const p = (o as { permissao?: string }).permissao;
      if (typeof p === "string" && ehPermissao(p)) {
        overrides.push({ permissao: p, concedida: Boolean((o as { concedida?: boolean }).concedida) });
      }
    }
    return {
      id: m.id as string,
      usuarioNome: u?.nome ?? "(sem nome)",
      usuarioEmail: u?.email ?? "",
      ativo: Boolean(m.ativo),
      fundador: Boolean(m.fundador),
      rotuloId: (m.rotulo_id as string | null) ?? null,
      overrides,
      ehVoce: (m.usuario_id as string) === usuarioAtualId,
    };
  });
}

export async function trocarRotuloDoMembro(
  supabase: SupabaseClient,
  membroId: string,
  rotuloId: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("membro")
    .update({ rotulo_id: rotuloId })
    .eq("id", membroId);
  if (error) {
    throw new Error(`Falha ao trocar o rótulo: ${error.message}`);
  }
}

export async function definirAtivoDoMembro(
  supabase: SupabaseClient,
  membroId: string,
  ativo: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("membro")
    .update({ ativo })
    .eq("id", membroId);
  if (error) {
    throw new Error(`Falha ao alterar o membro: ${error.message}`);
  }
}

export async function definirOverrideDoMembro(
  supabase: SupabaseClient,
  membroId: string,
  permissao: Permissao,
  concedida: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("membro_permissao")
    .upsert(
      { membro_id: membroId, permissao, concedida },
      { onConflict: "membro_id,permissao" },
    );
  if (error) {
    throw new Error(`Falha ao gravar a exceção: ${error.message}`);
  }
}

export async function removerOverrideDoMembro(
  supabase: SupabaseClient,
  membroId: string,
  permissao: string,
): Promise<void> {
  const { error } = await supabase
    .from("membro_permissao")
    .delete()
    .eq("membro_id", membroId)
    .eq("permissao", permissao);
  if (error) {
    throw new Error(`Falha ao remover a exceção: ${error.message}`);
  }
}

function um<T>(v: unknown): T | null {
  if (Array.isArray(v)) return (v[0] as T) ?? null;
  return (v as T) ?? null;
}
