// Acesso a dados: o detalhe completo de uma atividade (tela de detalhe, §4 C.8).

import type { SupabaseClient } from "@supabase/supabase-js";
import type { StatusAtividade } from "@/lib/domain/atividade";
import type { MemoriaCalculo } from "@/lib/domain/prazo";

export type ObservacaoItem = {
  id: string;
  texto: string;
  autorNome: string | null;
  criado_em: string;
};

export type HistoricoItem = {
  id: string;
  campo: string;
  valor_anterior: unknown;
  valor_novo: unknown;
  motivo: string | null;
  alterado_em: string;
  autorNome: string | null;
};

export type DetalheAtividade = {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: "prazo" | "compromisso" | "monitoramento";
  data: string;
  status: StatusAtividade;
  dataConclusao: string | null;
  observacaoConclusao: string | null;
  pastaId: string;
  pastaCodigo: string;
  pastaNome: string | null;
  clienteNome: string | null;
  processoTipo: string;
  processoNumero: string | null;
  tipoAtividadeNome: string | null;
  recorrenciaId: string | null;
  // atividade_compromisso (quando tipo='compromisso')
  compromisso: {
    hora: string | null;
    local: string | null;
    duracaoEstimadaMin: number | null;
  } | null;
  // atividade_monitoramento (quando tipo='monitoramento')
  monitoramento: {
    alvo: string | null;
    ultimaVerificacao: string | null;
  } | null;
  // atividade_prazo (quando tipo='prazo')
  prazo: {
    tribunalId: string | null;
    eventoTipo: string;
    eventoData: string;
    prazoFatalCalculado: string | null;
    prazoFatal: string;
    prazoFatalAjustadoManual: boolean;
    prazoInternoCalculado: string | null;
    prazoInterno: string;
    prazoInternoAjustadoManual: boolean;
    prazoApertado: boolean;
    motivoAjuste: string | null;
    calculoDesatualizado: boolean;
    memoriaCalculo: MemoriaCalculo | null;
  } | null;
  observacoes: ObservacaoItem[];
  historico: HistoricoItem[];
};

export async function carregarDetalheAtividade(
  supabase: SupabaseClient,
  escritorioId: string,
  atividadeId: string,
): Promise<DetalheAtividade | null> {
  const { data, error } = await supabase
    .from("atividade")
    .select(
      `id, titulo, descricao, tipo, data, status, data_conclusao, observacao_conclusao, recorrencia_id,
       tipo_atividade:tipo_atividade_id ( nome ),
       processo:processo_id (
         tipo, numero,
         pasta_id,
         pasta:pasta_id ( codigo, nome, pasta_cliente ( cliente:cliente_id ( nome ) ) )
       ),
       atividade_compromisso ( hora, local, duracao_estimada_min ),
       atividade_monitoramento ( alvo, ultima_verificacao ),
       atividade_prazo (
         tribunal_id, evento_tipo, evento_data,
         prazo_fatal_calculado, prazo_fatal, prazo_fatal_ajustado_manual,
         prazo_interno_calculado, prazo_interno, prazo_interno_ajustado_manual,
         prazo_apertado, motivo_ajuste, calculo_desatualizado, memoria_calculo
       )`,
    )
    .eq("escritorio_id", escritorioId)
    .eq("id", atividadeId)
    .is("deletado_em", null)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao carregar a atividade: ${error.message}`);
  }
  if (!data) {
    return null;
  }

  const [obsRes, histRes] = await Promise.all([
    supabase
      .from("observacao")
      .select("id, texto, criado_em, autor:autor_id ( usuario:usuario_id ( nome ) )")
      .eq("atividade_id", atividadeId)
      .is("deletado_em", null)
      .order("criado_em", { ascending: false }),
    supabase
      .from("prazo_historico")
      .select(
        "id, campo, valor_anterior, valor_novo, motivo, alterado_em, autor:alterado_por ( usuario:usuario_id ( nome ) )",
      )
      .eq("atividade_id", atividadeId)
      .order("alterado_em", { ascending: false }),
  ]);

  const processo = um<{
    tipo: string;
    numero: string | null;
    pasta_id: string;
    pasta: unknown;
  }>(data.processo);
  const pasta = um<{
    codigo: string;
    nome: string | null;
    pasta_cliente: unknown;
  }>(processo?.pasta);
  const cliente = um<{ nome: string }>(
    um<{ cliente: unknown }>(arr(pasta?.pasta_cliente)[0])?.cliente,
  );
  const p = um<Record<string, unknown>>(data.atividade_prazo);
  const c = um<Record<string, unknown>>(data.atividade_compromisso);
  const mo = um<Record<string, unknown>>(data.atividade_monitoramento);

  return {
    id: data.id as string,
    titulo: data.titulo as string,
    descricao: (data.descricao as string | null) ?? null,
    tipo: data.tipo as DetalheAtividade["tipo"],
    data: data.data as string,
    status: data.status as StatusAtividade,
    dataConclusao: (data.data_conclusao as string | null) ?? null,
    observacaoConclusao: (data.observacao_conclusao as string | null) ?? null,
    pastaId: processo?.pasta_id ?? "",
    pastaCodigo: pasta?.codigo ?? "—",
    pastaNome: pasta?.nome ?? null,
    clienteNome: cliente?.nome ?? null,
    processoTipo: processo?.tipo ?? "geral",
    processoNumero:
      processo?.tipo && processo.tipo !== "geral"
        ? (processo.numero ?? null)
        : null,
    tipoAtividadeNome: um<{ nome: string }>(data.tipo_atividade)?.nome ?? null,
    recorrenciaId: (data.recorrencia_id as string | null) ?? null,
    compromisso: c
      ? {
          hora: (c.hora as string | null) ?? null,
          local: (c.local as string | null) ?? null,
          duracaoEstimadaMin: (c.duracao_estimada_min as number | null) ?? null,
        }
      : null,
    monitoramento: mo
      ? {
          alvo: (mo.alvo as string | null) ?? null,
          ultimaVerificacao: (mo.ultima_verificacao as string | null) ?? null,
        }
      : null,
    prazo: p
      ? {
          tribunalId: (p.tribunal_id as string | null) ?? null,
          eventoTipo: p.evento_tipo as string,
          eventoData: p.evento_data as string,
          prazoFatalCalculado: (p.prazo_fatal_calculado as string | null) ?? null,
          prazoFatal: p.prazo_fatal as string,
          prazoFatalAjustadoManual: Boolean(p.prazo_fatal_ajustado_manual),
          prazoInternoCalculado:
            (p.prazo_interno_calculado as string | null) ?? null,
          prazoInterno: p.prazo_interno as string,
          prazoInternoAjustadoManual: Boolean(p.prazo_interno_ajustado_manual),
          prazoApertado: Boolean(p.prazo_apertado),
          motivoAjuste: (p.motivo_ajuste as string | null) ?? null,
          calculoDesatualizado: Boolean(p.calculo_desatualizado),
          memoriaCalculo: (p.memoria_calculo as MemoriaCalculo | null) ?? null,
        }
      : null,
    observacoes: (obsRes.data ?? []).map((o) => ({
      id: o.id as string,
      texto: o.texto as string,
      criado_em: o.criado_em as string,
      autorNome: nomeDoAutor(o.autor),
    })),
    historico: (histRes.data ?? []).map((h) => ({
      id: h.id as string,
      campo: h.campo as string,
      valor_anterior: h.valor_anterior,
      valor_novo: h.valor_novo,
      motivo: (h.motivo as string | null) ?? null,
      alterado_em: h.alterado_em as string,
      autorNome: nomeDoAutor(h.autor),
    })),
  };
}

function nomeDoAutor(autor: unknown): string | null {
  return um<{ nome: string }>(um<{ usuario: unknown }>(autor)?.usuario)?.nome ?? null;
}

function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : v ? [v] : [];
}
function um<T>(v: unknown): T | null {
  if (Array.isArray(v)) return (v[0] as T) ?? null;
  return (v as T) ?? null;
}
