// Acesso a dados: `andamento` — o fio cronológico da Tramitação.
//
// `andamento` é uma CÓPIA read-only pra exibição. A fonte de verdade de cada
// fato continua na coluna de origem (atividade.descricao, observacao,
// prazo_historico.motivo, publicacao.motivo_descarte). Ver
// docs/features/tramitacao.md.
//
// `registrarAndamento` é o único ponto de INSERT — os 6 gatilhos automáticos
// (atividade-acoes.ts, atividades/nova/acoes.ts, agenda/acoes.ts, publicacoes.ts)
// chamam essa mesma função logo depois da escrita que já existe.

import type { SupabaseClient } from "@supabase/supabase-js";

export type OrigemAndamento =
  | "manual"
  | "criacao_atividade"
  | "conclusao_atividade"
  | "observacao_atividade"
  | "ajuste_prazo"
  | "publicacao_djen";

export type AndamentoItem = {
  id: string;
  texto: string;
  origem: OrigemAndamento;
  // null → exibir como "Sistema" (só acontece em origem='publicacao_djen')
  autorNome: string | null;
  criadoEm: string;
  // a qual processo este andamento pertence (útil na visão por pasta)
  processoId: string;
  processoNumero: string | null;
  // vínculos (selo + link na UI)
  atividadeId: string | null;
  atividadeTipo: "prazo" | "compromisso" | "monitoramento" | null;
  publicacaoId: string | null;
};

// Visão por processo: junta o processo pra trazer o número.
const SELECT_POR_PROCESSO = `
  id, texto, origem, criado_em, processo_id, atividade_id, publicacao_id,
  autor:autor_membro_id ( usuario:usuario_id ( nome ) ),
  atividade:atividade_id ( tipo ),
  processo:processo_id ( numero, pasta_id )`;

// Visão por pasta: `!inner` pra poder filtrar por processo.pasta_id.
const SELECT_POR_PASTA = `
  id, texto, origem, criado_em, processo_id, atividade_id, publicacao_id,
  autor:autor_membro_id ( usuario:usuario_id ( nome ) ),
  atividade:atividade_id ( tipo ),
  processo:processo_id!inner ( numero, pasta_id )`;

// O fio de um processo, do mais antigo pro mais recente (o mais novo fica
// embaixo na tela, como o protótipo).
export async function listarAndamentosDoProcesso(
  supabase: SupabaseClient,
  escritorioId: string,
  processoId: string,
): Promise<AndamentoItem[]> {
  const { data, error } = await supabase
    .from("andamento")
    .select(SELECT_POR_PROCESSO)
    .eq("escritorio_id", escritorioId)
    .eq("processo_id", processoId)
    .is("deletado_em", null)
    .order("criado_em", { ascending: true });

  if (error) {
    throw new Error(`Falha ao listar a tramitação: ${error.message}`);
  }
  return (data ?? []).map(mapear);
}

// O fio de uma pasta = os andamentos de TODOS os processos dela (join pelo
// processo.pasta_id). "Ver por pasta" do plano.
export async function listarAndamentosDaPasta(
  supabase: SupabaseClient,
  escritorioId: string,
  pastaId: string,
): Promise<AndamentoItem[]> {
  const { data, error } = await supabase
    .from("andamento")
    .select(SELECT_POR_PASTA)
    .eq("escritorio_id", escritorioId)
    .eq("processo.pasta_id", pastaId)
    .is("deletado_em", null)
    .order("criado_em", { ascending: true });

  if (error) {
    throw new Error(`Falha ao listar a tramitação da pasta: ${error.message}`);
  }
  return (data ?? []).map(mapear);
}

// Anotação manual escrita direto na tela da Tramitação (sem vínculo).
export async function criarAndamentoManual(
  supabase: SupabaseClient,
  args: {
    escritorioId: string;
    processoId: string;
    autorMembroId: string;
    texto: string;
  },
): Promise<void> {
  await registrarAndamento(supabase, {
    escritorioId: args.escritorioId,
    processoId: args.processoId,
    autorMembroId: args.autorMembroId,
    origem: "manual",
    texto: args.texto,
  });
}

// Helper interno único — o INSERT em `andamento` mora só aqui. Chamado pelos
// gatilhos automáticos logo depois da escrita que já existia.
export async function registrarAndamento(
  supabase: SupabaseClient,
  args: {
    escritorioId: string;
    processoId: string;
    // null SÓ quando origem='publicacao_djen'
    autorMembroId: string | null;
    origem: OrigemAndamento;
    texto: string;
    atividadeId?: string | null;
    publicacaoId?: string | null;
  },
): Promise<void> {
  const texto = args.texto.trim();
  if (!texto) return; // nada a registrar (justificativa em branco, etc.)

  const { error } = await supabase.from("andamento").insert({
    escritorio_id: args.escritorioId,
    processo_id: args.processoId,
    autor_membro_id: args.autorMembroId,
    origem: args.origem,
    texto,
    atividade_id: args.atividadeId ?? null,
    publicacao_id: args.publicacaoId ?? null,
  });
  if (error) {
    throw new Error(`Falha ao registrar o andamento: ${error.message}`);
  }
}

// ── interno ────────────────────────────────────────────────────────────────
function mapear(linha: Record<string, unknown>): AndamentoItem {
  const processo = um<{ numero: string | null }>(linha.processo);
  const atividade = um<{ tipo: string }>(linha.atividade);
  return {
    id: linha.id as string,
    texto: linha.texto as string,
    origem: linha.origem as OrigemAndamento,
    autorNome:
      um<{ nome: string }>(um<{ usuario: unknown }>(linha.autor)?.usuario)
        ?.nome ?? null,
    criadoEm: linha.criado_em as string,
    processoId: linha.processo_id as string,
    processoNumero: processo?.numero ?? null,
    atividadeId: (linha.atividade_id as string | null) ?? null,
    atividadeTipo:
      (atividade?.tipo as AndamentoItem["atividadeTipo"]) ?? null,
    publicacaoId: (linha.publicacao_id as string | null) ?? null,
  };
}

function um<T>(v: unknown): T | null {
  if (Array.isArray(v)) return (v[0] as T) ?? null;
  return (v as T) ?? null;
}
