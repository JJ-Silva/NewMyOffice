// Acesso a dados: mutações na agenda (concluir, reativar, cancelar, anotar,
// ajustar datas do prazo). §4 Bloco C.

import type { SupabaseClient } from "@supabase/supabase-js";

export async function concluirAtividade(
  supabase: SupabaseClient,
  args: {
    atividadeId: string;
    membroId: string;
    dataConclusao: string;
    observacaoConclusao: string | null;
  },
): Promise<void> {
  const { error } = await supabase
    .from("atividade")
    .update({
      status: "concluida",
      data_conclusao: args.dataConclusao,
      concluida_por: args.membroId,
      observacao_conclusao: args.observacaoConclusao,
    })
    .eq("id", args.atividadeId);
  if (error) throw new Error(`Falha ao concluir: ${error.message}`);
}

export async function reativarAtividade(
  supabase: SupabaseClient,
  atividadeId: string,
): Promise<void> {
  const { error } = await supabase
    .from("atividade")
    .update({
      status: "pendente",
      data_conclusao: null,
      concluida_por: null,
      observacao_conclusao: null,
    })
    .eq("id", atividadeId);
  if (error) throw new Error(`Falha ao reativar: ${error.message}`);
}

export async function cancelarAtividade(
  supabase: SupabaseClient,
  args: { atividadeId: string; escritorioId: string; membroId: string; motivo: string },
): Promise<void> {
  const { error } = await supabase
    .from("atividade")
    .update({ status: "cancelada" })
    .eq("id", args.atividadeId);
  if (error) throw new Error(`Falha ao cancelar: ${error.message}`);

  await adicionarObservacao(supabase, {
    escritorioId: args.escritorioId,
    atividadeId: args.atividadeId,
    autorId: args.membroId,
    texto: `Atividade cancelada. Motivo: ${args.motivo}`,
  });
}

export async function adicionarObservacao(
  supabase: SupabaseClient,
  args: {
    escritorioId: string;
    atividadeId: string;
    autorId: string;
    texto: string;
  },
): Promise<void> {
  const { error } = await supabase.from("observacao").insert({
    escritorio_id: args.escritorioId,
    atividade_id: args.atividadeId,
    autor_id: args.autorId,
    texto: args.texto,
  });
  if (error) throw new Error(`Falha ao gravar a anotação: ${error.message}`);
}

// Ajuste manual das datas do prazo (§4.B "Data calculada × data adotada").
// Grava uma linha em prazo_historico por campo alterado; motivo é obrigatório.
export async function ajustarDatasDoPrazo(
  supabase: SupabaseClient,
  args: {
    atividadeId: string;
    escritorioId: string;
    membroId: string;
    motivo: string;
    fatalAtual: string;
    fatalNovo: string;
    internoAtual: string;
    internoNovo: string;
    // false quando o interno mudou só porque foi re-derivado do novo fatal
    // (não conta como ajuste manual — §4.B).
    internoFoiManual: boolean;
  },
): Promise<void> {
  const mudouFatal = args.fatalNovo !== args.fatalAtual;
  const mudouInterno = args.internoNovo !== args.internoAtual;
  if (!mudouFatal && !mudouInterno) {
    return;
  }

  const historico: {
    escritorio_id: string;
    atividade_id: string;
    alterado_por: string;
    campo: string;
    valor_anterior: unknown;
    valor_novo: unknown;
    motivo: string;
  }[] = [];
  if (mudouFatal) {
    historico.push({
      escritorio_id: args.escritorioId,
      atividade_id: args.atividadeId,
      alterado_por: args.membroId,
      campo: "prazo_fatal",
      valor_anterior: args.fatalAtual,
      valor_novo: args.fatalNovo,
      motivo: args.motivo,
    });
  }
  if (mudouInterno) {
    historico.push({
      escritorio_id: args.escritorioId,
      atividade_id: args.atividadeId,
      alterado_por: args.membroId,
      campo: "prazo_interno",
      valor_anterior: args.internoAtual,
      valor_novo: args.internoNovo,
      motivo: args.motivo,
    });
  }

  const hist = await supabase.from("prazo_historico").insert(historico);
  if (hist.error) {
    throw new Error(`Falha ao gravar o histórico: ${hist.error.message}`);
  }

  const atualizacao: Record<string, unknown> = { motivo_ajuste: args.motivo };
  if (mudouFatal) {
    atualizacao.prazo_fatal = args.fatalNovo;
    atualizacao.prazo_fatal_ajustado_manual = true;
  }
  if (mudouInterno) {
    atualizacao.prazo_interno = args.internoNovo;
    if (args.internoFoiManual) {
      atualizacao.prazo_interno_ajustado_manual = true;
    }
  }

  const upd = await supabase
    .from("atividade_prazo")
    .update(atualizacao)
    .eq("atividade_id", args.atividadeId);
  if (upd.error) {
    throw new Error(`Falha ao ajustar as datas: ${upd.error.message}`);
  }
  // a trigger atividade_prazo_sincroniza_data cuida de atividade.data = prazo_fatal
}
