// Acesso a dados: `rotulo` + `rotulo_permissao` (Etapa 6).
// O rótulo é a "função" da pessoa no escritório; carrega um conjunto de
// permissões. Query Supabase visível, sem query builder dinâmico.

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  garantirDependencias,
  ehPermissao,
  type Permissao,
} from "@/lib/domain/permissoes";

export type RotuloComPermissoes = {
  id: string;
  nome: string;
  descricao: string | null;
  permissoes: Permissao[];
  qtdMembros: number;
};

export type NovoRotulo = {
  nome: string;
  descricao: string | null;
  permissoes: Permissao[];
};

export async function listarRotulos(
  supabase: SupabaseClient,
  escritorioId: string,
): Promise<RotuloComPermissoes[]> {
  const [rotulosRes, membrosRes] = await Promise.all([
    supabase
      .from("rotulo")
      .select("id, nome, descricao, rotulo_permissao ( permissao )")
      .eq("escritorio_id", escritorioId)
      .is("deletado_em", null)
      .order("nome", { ascending: true }),
    supabase
      .from("membro")
      .select("rotulo_id")
      .eq("escritorio_id", escritorioId)
      .is("deletado_em", null),
  ]);

  if (rotulosRes.error) {
    throw new Error(`Falha ao listar rótulos: ${rotulosRes.error.message}`);
  }
  if (membrosRes.error) {
    throw new Error(`Falha ao contar membros: ${membrosRes.error.message}`);
  }

  const contagem = new Map<string, number>();
  for (const m of membrosRes.data ?? []) {
    const id = m.rotulo_id as string | null;
    if (id) contagem.set(id, (contagem.get(id) ?? 0) + 1);
  }

  return (rotulosRes.data ?? []).map((r) => ({
    id: r.id as string,
    nome: r.nome as string,
    descricao: (r.descricao as string | null) ?? null,
    permissoes: extrairPermissoes(r.rotulo_permissao),
    qtdMembros: contagem.get(r.id as string) ?? 0,
  }));
}

export async function criarRotulo(
  supabase: SupabaseClient,
  escritorioId: string,
  dados: NovoRotulo,
): Promise<string> {
  const nome = dados.nome.trim();
  if (!nome) {
    throw new Error("Informe o nome do rótulo.");
  }

  const { data, error } = await supabase
    .from("rotulo")
    .insert({
      escritorio_id: escritorioId,
      nome,
      descricao: dados.descricao?.trim() || null,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(traduzirErro(error.message, error.code));
  }

  await definirPermissoesDoRotulo(supabase, data.id as string, dados.permissoes);
  return data.id as string;
}

export async function atualizarRotulo(
  supabase: SupabaseClient,
  rotuloId: string,
  dados: NovoRotulo,
): Promise<void> {
  const nome = dados.nome.trim();
  if (!nome) {
    throw new Error("Informe o nome do rótulo.");
  }

  const { error } = await supabase
    .from("rotulo")
    .update({ nome, descricao: dados.descricao?.trim() || null })
    .eq("id", rotuloId);

  if (error) {
    throw new Error(traduzirErro(error.message, error.code));
  }

  await definirPermissoesDoRotulo(supabase, rotuloId, dados.permissoes);
}

// Substitui TODO o conjunto de permissões do rótulo (apaga e reinsere).
// `garantirDependencias` força o `.ver` de todo grupo que tenha alguma ação.
export async function definirPermissoesDoRotulo(
  supabase: SupabaseClient,
  rotuloId: string,
  permissoes: readonly string[],
): Promise<void> {
  const limpas = garantirDependencias(permissoes);

  const del = await supabase
    .from("rotulo_permissao")
    .delete()
    .eq("rotulo_id", rotuloId);
  if (del.error) {
    throw new Error(`Falha ao limpar permissões: ${del.error.message}`);
  }

  if (limpas.length === 0) return;

  const ins = await supabase
    .from("rotulo_permissao")
    .insert(limpas.map((permissao) => ({ rotulo_id: rotuloId, permissao })));
  if (ins.error) {
    throw new Error(`Falha ao gravar permissões: ${ins.error.message}`);
  }
}

// Soft-delete. Bloqueia se ainda houver membro com o rótulo — o admin troca
// o rótulo dessas pessoas primeiro.
export async function excluirRotulo(
  supabase: SupabaseClient,
  rotuloId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("membro")
    .select("id")
    .eq("rotulo_id", rotuloId)
    .is("deletado_em", null)
    .limit(1);

  if (error) {
    throw new Error(`Falha ao verificar o rótulo: ${error.message}`);
  }
  if (data && data.length > 0) {
    throw new Error(
      "Há membros com este rótulo. Troque o rótulo dessas pessoas antes de excluir.",
    );
  }

  const del = await supabase
    .from("rotulo")
    .update({ deletado_em: new Date().toISOString() })
    .eq("id", rotuloId);
  if (del.error) {
    throw new Error(`Falha ao excluir o rótulo: ${del.error.message}`);
  }
}

function extrairPermissoes(bruto: unknown): Permissao[] {
  const linhas = Array.isArray(bruto) ? bruto : [];
  const set = new Set<Permissao>();
  for (const l of linhas) {
    const p = (l as { permissao?: string }).permissao;
    if (typeof p === "string" && ehPermissao(p)) set.add(p);
  }
  return [...set];
}

function traduzirErro(mensagem: string, codigo?: string): string {
  if (codigo === "23505") {
    return "Já existe um rótulo com esse nome neste escritório.";
  }
  return mensagem;
}
