"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { exigirSessao } from "@/lib/supabase/sessao";
import { hojeNoBrasil } from "@/lib/hoje";
import { prazoInternoAPartirDoFatal } from "@/lib/domain/prazo";
import { carregarConfiguracao } from "@/lib/db/configuracao";
import { carregarCalendarioDoTribunal } from "@/lib/db/calendario";
import { carregarDetalheAtividade } from "@/lib/db/atividade-detalhe";
import {
  concluirAtividade,
  reativarAtividade,
  cancelarAtividade,
  adicionarObservacao,
  ajustarDatasDoPrazo,
  registrarVerificacao,
} from "@/lib/db/atividade-acoes";
import { gerarProximaInstancia } from "@/lib/db/recorrencias";

function texto(fd: FormData, campo: string): string {
  return String(fd.get(campo) ?? "").trim();
}

async function contexto() {
  const sessao = await exigirSessao();
  const supabase = await criarClienteServidor();
  return { sessao, supabase };
}

function recarregar(id: string) {
  revalidatePath("/agenda");
  revalidatePath(`/agenda/${id}`);
}

export async function concluir(formData: FormData) {
  const { sessao, supabase } = await contexto();
  const id = texto(formData, "id");
  if (!id) return;
  await concluirAtividade(supabase, {
    atividadeId: id,
    membroId: sessao.membro.id,
    dataConclusao: hojeNoBrasil(),
    observacaoConclusao: texto(formData, "observacao") || null,
  });
  // Se é uma instância de recorrência, garante que a próxima já exista.
  await gerarProximaInstancia(supabase, sessao.escritorioId, id, hojeNoBrasil());
  recarregar(id);
}

export async function reativar(formData: FormData) {
  const { supabase } = await contexto();
  const id = texto(formData, "id");
  if (!id) return;
  await reativarAtividade(supabase, id);
  recarregar(id);
}

export async function cancelar(formData: FormData) {
  const { sessao, supabase } = await contexto();
  const id = texto(formData, "id");
  const motivo = texto(formData, "motivo");
  if (!id || !motivo) {
    redirect(`/agenda/${id}?erro=` + encodeURIComponent("Informe o motivo do cancelamento."));
  }
  await cancelarAtividade(supabase, {
    atividadeId: id,
    escritorioId: sessao.escritorioId,
    membroId: sessao.membro.id,
    motivo,
  });
  recarregar(id);
}

export async function verificar(formData: FormData) {
  const { sessao, supabase } = await contexto();
  const id = texto(formData, "id");
  const resultado = texto(formData, "resultado");
  const achouMudanca = formData.get("achou_mudanca") === "1";
  if (!id || !resultado) {
    redirect(
      `/agenda/${id}?erro=` +
        encodeURIComponent("Descreva o resultado da verificação."),
    );
  }

  const { data } = await supabase
    .from("atividade")
    .select("prioridade_manual")
    .eq("id", id)
    .maybeSingle();

  await registrarVerificacao(supabase, {
    atividadeId: id,
    escritorioId: sessao.escritorioId,
    membroId: sessao.membro.id,
    dataHoje: hojeNoBrasil(),
    resultado,
    achouMudanca,
    prioridadeAtual:
      (data?.prioridade_manual as
        | "baixa"
        | "media"
        | "alta"
        | "urgente"
        | undefined) ?? "media",
  });
  // Monitoramento recorrente: agenda a próxima verificação.
  await gerarProximaInstancia(supabase, sessao.escritorioId, id, hojeNoBrasil());
  recarregar(id);
}

export async function anotar(formData: FormData) {
  const { sessao, supabase } = await contexto();
  const id = texto(formData, "id");
  const txt = texto(formData, "texto");
  if (!id || !txt) return;
  await adicionarObservacao(supabase, {
    escritorioId: sessao.escritorioId,
    atividadeId: id,
    autorId: sessao.membro.id,
    texto: txt,
  });
  recarregar(id);
}

export async function ajustarPrazo(formData: FormData) {
  const { sessao, supabase } = await contexto();
  const id = texto(formData, "id");
  const motivo = texto(formData, "motivo");
  const fatalNovo = texto(formData, "prazo_fatal");
  let internoNovo = texto(formData, "prazo_interno");

  if (!id) return;
  if (!motivo) {
    redirect(`/agenda/${id}?erro=` + encodeURIComponent("O motivo do ajuste é obrigatório."));
  }

  const detalhe = await carregarDetalheAtividade(supabase, sessao.escritorioId, id);
  if (!detalhe || !detalhe.prazo) {
    redirect("/agenda");
  }

  const fatalAtual = detalhe.prazo.prazoFatal;
  const internoAtual = detalhe.prazo.prazoInterno;

  // Se o fatal mudou e o interno foi deixado como está (e não foi ajustado à
  // mão antes), re-deriva o interno = fatal − margem (§4.B). A re-derivação
  // NÃO conta como ajuste manual do interno.
  let internoReDerivado = false;
  if (
    fatalNovo &&
    fatalNovo !== fatalAtual &&
    internoNovo === internoAtual &&
    !detalhe.prazo.prazoInternoAjustadoManual
  ) {
    const config = await carregarConfiguracao(supabase, sessao.escritorioId);
    const calendario = await carregarCalendarioDoTribunal(
      supabase,
      sessao.escritorioId,
      detalhe.prazo.tribunalId,
    );
    internoNovo = prazoInternoAPartirDoFatal(
      fatalNovo,
      config.margem_prazo_interno_dias,
      calendario,
      true,
    );
    internoReDerivado = true;
  }

  await ajustarDatasDoPrazo(supabase, {
    atividadeId: id,
    escritorioId: sessao.escritorioId,
    membroId: sessao.membro.id,
    motivo,
    fatalAtual,
    fatalNovo: fatalNovo || fatalAtual,
    internoAtual,
    internoNovo: internoNovo || internoAtual,
    internoFoiManual: !internoReDerivado,
  });
  recarregar(id);
}
