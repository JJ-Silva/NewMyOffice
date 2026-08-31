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

// ── Gestão do catálogo (tela de Configurações) ────────────────────────────────
export type TipoAtividadeGestao = TipoAtividadeCatalogo & {
  categoria: string | null;
  ativo: boolean;
};

export async function listarTiposParaGestao(
  supabase: SupabaseClient,
  escritorioId: string,
): Promise<TipoAtividadeGestao[]> {
  const { data, error } = await supabase
    .from("tipo_atividade")
    .select("id, nome, aplica_a, dias_padrao, natureza, exige_peca, categoria, ativo")
    .eq("escritorio_id", escritorioId)
    .is("deletado_em", null)
    .order("aplica_a", { ascending: true })
    .order("nome", { ascending: true });

  if (error) {
    throw new Error(`Falha ao listar o catálogo: ${error.message}`);
  }
  return (data ?? []) as TipoAtividadeGestao[];
}

export type CamposTipoAtividade = {
  nome: string;
  aplicaA: "prazo" | "compromisso" | "monitoramento";
  diasPadrao: number | null;
  natureza: NaturezaPrazo | null;
  exigePeca: boolean;
  categoria: string | null;
};

// Campos que só valem para 'prazo' são zerados nos outros tipos.
function normalizar(c: CamposTipoAtividade) {
  const ehPrazo = c.aplicaA === "prazo";
  return {
    nome: c.nome,
    aplica_a: c.aplicaA,
    dias_padrao: ehPrazo ? c.diasPadrao : null,
    natureza: ehPrazo ? c.natureza : null,
    exige_peca: ehPrazo ? c.exigePeca : false,
    categoria: ehPrazo ? c.categoria : null,
  };
}

export async function criarTipoDeAtividade(
  supabase: SupabaseClient,
  escritorioId: string,
  c: CamposTipoAtividade,
): Promise<void> {
  const { error } = await supabase
    .from("tipo_atividade")
    .insert({ escritorio_id: escritorioId, ...normalizar(c) });
  if (error) {
    throw new Error(`Falha ao criar o tipo: ${error.message}`);
  }
}

export async function atualizarTipoDeAtividade(
  supabase: SupabaseClient,
  id: string,
  c: CamposTipoAtividade,
): Promise<void> {
  const { error } = await supabase
    .from("tipo_atividade")
    .update(normalizar(c))
    .eq("id", id);
  if (error) {
    throw new Error(`Falha ao atualizar o tipo: ${error.message}`);
  }
}

// Soft-delete (§0). Prazos/atividades já lançados com esse tipo continuam
// intactos — o tipo só some do catálogo para novos lançamentos.
export async function excluirTipoDeAtividade(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("tipo_atividade")
    .update({ deletado_em: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    throw new Error(`Falha ao excluir o tipo: ${error.message}`);
  }
}
