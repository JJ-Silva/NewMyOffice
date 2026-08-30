"use server";

import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { exigirSessao } from "@/lib/supabase/sessao";
import { hojeNoBrasil } from "@/lib/hoje";
import {
  criarPrazo,
  criarCompromisso,
  criarMonitoramento,
} from "@/lib/db/atividades";
import { listarProcessosDaPasta } from "@/lib/db/processos";
import { listarTiposDeAtividade } from "@/lib/db/tipos-atividade";
import { lerCampos, calcular } from "./calculo";

// Salva o prazo. RECALCULA tudo do zero — não confia nas datas do formulário.
export async function salvarPrazo(formData: FormData) {
  const sessao = await exigirSessao();
  const supabase = await criarClienteServidor();

  const campos = lerCampos((k) => {
    const v = formData.get(k);
    return typeof v === "string" ? v : null;
  });

  const calc = await calcular(
    supabase,
    sessao.escritorioId,
    campos,
    hojeNoBrasil(),
  );

  const paramsBase = new URLSearchParams({
    pasta: campos.pastaId,
    processo: campos.processoId,
    tipo: campos.tipoAtividadeId,
    tribunal: campos.tribunalId ?? "",
    evento_tipo: campos.eventoTipo,
    evento_data: campos.eventoData,
    dobro: campos.dobro ? "1" : "",
    dias: campos.diasInformado ? String(campos.diasInformado) : "",
    titulo: campos.titulo,
  });

  if (!calc.ok) {
    paramsBase.set("erro", calc.erro);
    redirect(`/atividades/nova?${paramsBase.toString()}`);
  }

  const { tipo, natureza, dias, resultado } = calc.dados;
  const titulo = campos.titulo.trim() || tipo.nome;

  try {
    await criarPrazo(supabase, {
      escritorioId: sessao.escritorioId,
      processoId: campos.processoId,
      tipoAtividadeId: tipo.id,
      titulo,
      responsavelId: sessao.membro.id,
      tribunalId: campos.tribunalId,
      natureza,
      dias,
      dobro: campos.dobro,
      excluirFeriados: true,
      eventoTipo: campos.eventoTipo,
      eventoData: campos.eventoData,
      prazoFatalCalculado: resultado.prazoFatalCalculado,
      prazoInternoCalculado: resultado.prazoInternoCalculado,
      prazoApertado: resultado.prazoApertado,
      memoriaCalculo: resultado.memoriaCalculo,
    });
  } catch (e) {
    paramsBase.set(
      "erro",
      e instanceof Error ? e.message : "Falha ao salvar o prazo.",
    );
    redirect(`/atividades/nova?${paramsBase.toString()}`);
  }

  redirect("/agenda?lancado=1");
}

// ── helpers compartilhados p/ compromisso e monitoramento ──────────────────
function texto(fd: FormData, campo: string): string {
  return String(fd.get(campo) ?? "").trim();
}

async function resolverProcessoGeral(
  supabase: Awaited<ReturnType<typeof criarClienteServidor>>,
  pastaId: string,
): Promise<string | null> {
  const processos = await listarProcessosDaPasta(supabase, pastaId);
  return processos.find((p) => p.tipo === "geral")?.id ?? null;
}

function voltarComErro(
  aba: "compromisso" | "monitoramento",
  pastaId: string,
  mensagem: string,
): never {
  const p = new URLSearchParams({ aba, pasta: pastaId, erro: mensagem });
  redirect(`/atividades/nova?${p.toString()}`);
}

// ── Compromisso ───────────────────────────────────────────────────────────
export async function salvarCompromisso(formData: FormData) {
  const sessao = await exigirSessao();
  const supabase = await criarClienteServidor();

  const pastaId = texto(formData, "pasta");
  const tipoId = texto(formData, "tipo");
  const data = texto(formData, "data");
  if (!pastaId || !tipoId || !data) {
    voltarComErro("compromisso", pastaId, "Preencha pasta, tipo e data.");
  }

  const processoId = await resolverProcessoGeral(supabase, pastaId);
  if (!processoId) {
    voltarComErro("compromisso", pastaId, "Pasta inválida.");
  }

  const tipos = await listarTiposDeAtividade(
    supabase,
    sessao.escritorioId,
    "compromisso",
  );
  const tipo = tipos.find((t) => t.id === tipoId);
  if (!tipo) {
    voltarComErro("compromisso", pastaId, "Tipo de compromisso inválido.");
  }

  const duracaoRaw = texto(formData, "duracao");
  try {
    await criarCompromisso(supabase, {
      escritorioId: sessao.escritorioId,
      processoId,
      tipoAtividadeId: tipo.id,
      titulo: texto(formData, "titulo") || tipo.nome,
      responsavelId: sessao.membro.id,
      data,
      hora: texto(formData, "hora") || null,
      local: texto(formData, "local") || null,
      duracaoEstimadaMin: duracaoRaw ? Math.trunc(Number(duracaoRaw)) : null,
    });
  } catch (e) {
    voltarComErro(
      "compromisso",
      pastaId,
      e instanceof Error ? e.message : "Falha ao salvar.",
    );
  }
  redirect("/agenda?lancado=1");
}

// ── Monitoramento ─────────────────────────────────────────────────────────
export async function salvarMonitoramento(formData: FormData) {
  const sessao = await exigirSessao();
  const supabase = await criarClienteServidor();

  const pastaId = texto(formData, "pasta");
  const tipoId = texto(formData, "tipo");
  const data = texto(formData, "data") || hojeNoBrasil();
  if (!pastaId || !tipoId) {
    voltarComErro("monitoramento", pastaId, "Preencha pasta e tipo.");
  }

  const processoId = await resolverProcessoGeral(supabase, pastaId);
  if (!processoId) {
    voltarComErro("monitoramento", pastaId, "Pasta inválida.");
  }

  const tipos = await listarTiposDeAtividade(
    supabase,
    sessao.escritorioId,
    "monitoramento",
  );
  const tipo = tipos.find((t) => t.id === tipoId);
  if (!tipo) {
    voltarComErro("monitoramento", pastaId, "Tipo de monitoramento inválido.");
  }

  try {
    await criarMonitoramento(supabase, {
      escritorioId: sessao.escritorioId,
      processoId,
      tipoAtividadeId: tipo.id,
      titulo: texto(formData, "titulo") || tipo.nome,
      responsavelId: sessao.membro.id,
      data,
      alvo: texto(formData, "alvo") || null,
    });
  } catch (e) {
    voltarComErro(
      "monitoramento",
      pastaId,
      e instanceof Error ? e.message : "Falha ao salvar.",
    );
  }
  redirect("/agenda?lancado=1");
}
