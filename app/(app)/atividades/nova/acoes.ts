"use server";

import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { exigirSessao, exigirPermissao } from "@/lib/supabase/sessao";
import { hojeNoBrasil } from "@/lib/hoje";
import {
  criarPrazo,
  criarCompromisso,
  criarMonitoramento,
} from "@/lib/db/atividades";
import { listarTiposDeAtividade } from "@/lib/db/tipos-atividade";
import { criarRecorrencia } from "@/lib/db/recorrencias";
import { marcarPublicacaoVirouPrazo } from "@/lib/db/publicacoes";
import {
  validarRegra,
  type Periodicidade,
  type RegraRecorrencia,
  type Termino,
} from "@/lib/domain/recorrencia";
import { lerCampos, calcular } from "./calculo";

// Salva o prazo. RECALCULA tudo do zero — não confia nas datas do formulário.
export async function salvarPrazo(formData: FormData) {
  const sessao = await exigirSessao();
  exigirPermissao(sessao, "atividades.criar");
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
    aba: "prazo",
    pasta: campos.pastaId,
    nivel: campos.nivel,
    tipo: campos.tipoAtividadeId,
    tribunal: campos.tribunalId ?? "",
    evento_tipo: campos.eventoTipo,
    evento_data: campos.eventoData,
    dobro: campos.dobro ? "1" : "",
    dias: campos.diasInformado ? String(campos.diasInformado) : "",
    titulo: campos.titulo,
    publicacao: campos.publicacaoId,
  });

  if (!calc.ok) {
    paramsBase.set("erro", calc.erro);
    redirect(`/atividades/nova?${paramsBase.toString()}`);
  }

  const { processoId, tipo, natureza, dias, resultado } = calc.dados;
  const titulo = campos.titulo.trim() || null;

  let atividadeId: string;
  try {
    atividadeId = await criarPrazo(supabase, {
      escritorioId: sessao.escritorioId,
      processoId,
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

  // Veio de uma publicação do DJEN (Etapa 5) → fecha a triagem.
  if (campos.publicacaoId) {
    await marcarPublicacaoVirouPrazo(supabase, {
      id: campos.publicacaoId,
      membroId: sessao.membro.id,
      atividadeId,
      processoId,
    });
    redirect("/publicacoes?virou=1");
  }

  redirect("/agenda?lancado=1");
}

// ── helpers compartilhados p/ compromisso e monitoramento ──────────────────
function texto(fd: FormData, campo: string): string {
  return String(fd.get(campo) ?? "").trim();
}

// O processo existe e é deste escritório?
async function processoValido(
  supabase: Awaited<ReturnType<typeof criarClienteServidor>>,
  escritorioId: string,
  processoId: string,
): Promise<boolean> {
  if (!processoId) return false;
  const { data } = await supabase
    .from("processo")
    .select("id")
    .eq("id", processoId)
    .eq("escritorio_id", escritorioId)
    .is("deletado_em", null)
    .maybeSingle();
  return Boolean(data);
}

function voltarComErro(
  aba: "compromisso" | "monitoramento",
  processoId: string,
  mensagem: string,
): never {
  const p = new URLSearchParams({ aba, erro: mensagem });
  if (processoId) p.set("processo", processoId);
  redirect(`/atividades/nova?${p.toString()}`);
}

// Lê os campos "rec_*" do formulário e monta a regra de recorrência (Etapa 3a).
// A data-base é a data da 1ª ocorrência (o campo "data" do formulário).
function lerRegraDoFormulario(
  fd: FormData,
  dataBase: string,
): { ok: true; regra: RegraRecorrencia } | { ok: false; erro: string } {
  const tipoPeriodicidade = texto(fd, "rec_periodicidade");
  let periodicidade: Periodicidade;
  if (tipoPeriodicidade === "semanal") {
    const dias = fd
      .getAll("rec_dias_semana")
      .map((v) => Math.trunc(Number(v)))
      .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
    periodicidade = { tipo: "semanal", diasDaSemana: dias };
  } else if (tipoPeriodicidade === "mensal") {
    periodicidade = {
      tipo: "mensal",
      diaDoMes: Math.trunc(Number(texto(fd, "rec_dia_do_mes"))),
    };
  } else {
    const unidade = texto(fd, "rec_intervalo_unidade");
    periodicidade = {
      tipo: "intervalo",
      cada: Math.trunc(Number(texto(fd, "rec_intervalo_cada"))),
      unidade:
        unidade === "dias" || unidade === "meses" ? unidade : "semanas",
    };
  }

  const tipoTermino = texto(fd, "rec_termino");
  let termino: Termino;
  if (tipoTermino === "data") {
    termino = { tipo: "data", ate: texto(fd, "rec_termino_ate") };
  } else if (tipoTermino === "ocorrencias") {
    termino = {
      tipo: "ocorrencias",
      total: Math.trunc(Number(texto(fd, "rec_termino_ocorrencias"))),
    };
  } else {
    termino = { tipo: "indefinido" };
  }

  const regra: RegraRecorrencia = { dataBase, periodicidade, termino };
  const v = validarRegra(regra);
  return v.ok ? { ok: true, regra } : { ok: false, erro: v.erro };
}

// ── Compromisso ───────────────────────────────────────────────────────────
export async function salvarCompromisso(formData: FormData) {
  const sessao = await exigirSessao();
  exigirPermissao(sessao, "atividades.criar");
  const supabase = await criarClienteServidor();

  const processoId = texto(formData, "processo_id");
  const tipoId = texto(formData, "tipo");
  const data = texto(formData, "data");
  if (!processoId || !tipoId || !data) {
    voltarComErro("compromisso", processoId, "Preencha processo, tipo e data.");
  }

  if (!(await processoValido(supabase, sessao.escritorioId, processoId))) {
    voltarComErro("compromisso", "", "Processo inválido.");
  }

  const tipos = await listarTiposDeAtividade(
    supabase,
    sessao.escritorioId,
    "compromisso",
  );
  const tipo = tipos.find((t) => t.id === tipoId);
  if (!tipo) {
    voltarComErro("compromisso", processoId, "Tipo de compromisso inválido.");
  }

  const duracaoRaw = texto(formData, "duracao");

  // Recorrência (Etapa 3a): cria a régua; ela materializa a 1ª instância.
  if (texto(formData, "repetir") === "1") {
    const r = lerRegraDoFormulario(formData, data);
    if (!r.ok) {
      voltarComErro("compromisso", processoId, r.erro);
    }
    try {
      await criarRecorrencia(
        supabase,
        {
          escritorioId: sessao.escritorioId,
          atividadeTipo: "compromisso",
          processoId,
          tipoAtividadeId: tipo.id,
          titulo: texto(formData, "titulo") || null,
          descricao: null,
          responsavelId: sessao.membro.id,
          prioridadeManual: "media",
          diasAntesVisivelCustom: null,
          hora: texto(formData, "hora") || null,
          local: texto(formData, "local") || null,
          duracaoEstimadaMin: duracaoRaw
            ? Math.trunc(Number(duracaoRaw))
            : null,
          alvo: null,
          regra: r.regra,
        },
        hojeNoBrasil(),
      );
    } catch (e) {
      voltarComErro(
        "compromisso",
        processoId,
        e instanceof Error ? e.message : "Falha ao salvar a recorrência.",
      );
    }
    redirect("/recorrencias?criada=1");
  }

  try {
    await criarCompromisso(supabase, {
      escritorioId: sessao.escritorioId,
      processoId,
      tipoAtividadeId: tipo.id,
      titulo: texto(formData, "titulo") || null,
      responsavelId: sessao.membro.id,
      data,
      hora: texto(formData, "hora") || null,
      local: texto(formData, "local") || null,
      duracaoEstimadaMin: duracaoRaw ? Math.trunc(Number(duracaoRaw)) : null,
    });
  } catch (e) {
    voltarComErro(
      "compromisso",
      processoId,
      e instanceof Error ? e.message : "Falha ao salvar.",
    );
  }
  redirect("/agenda?lancado=1");
}

// ── Monitoramento ─────────────────────────────────────────────────────────
export async function salvarMonitoramento(formData: FormData) {
  const sessao = await exigirSessao();
  exigirPermissao(sessao, "atividades.criar");
  const supabase = await criarClienteServidor();

  const processoId = texto(formData, "processo_id");
  const tipoId = texto(formData, "tipo");
  const data = texto(formData, "data") || hojeNoBrasil();
  if (!processoId || !tipoId) {
    voltarComErro("monitoramento", processoId, "Preencha processo e tipo.");
  }

  if (!(await processoValido(supabase, sessao.escritorioId, processoId))) {
    voltarComErro("monitoramento", "", "Processo inválido.");
  }

  const tipos = await listarTiposDeAtividade(
    supabase,
    sessao.escritorioId,
    "monitoramento",
  );
  const tipo = tipos.find((t) => t.id === tipoId);
  if (!tipo) {
    voltarComErro(
      "monitoramento",
      processoId,
      "Tipo de monitoramento inválido.",
    );
  }

  // Recorrência (Etapa 3a).
  if (texto(formData, "repetir") === "1") {
    const r = lerRegraDoFormulario(formData, data);
    if (!r.ok) {
      voltarComErro("monitoramento", processoId, r.erro);
    }
    try {
      await criarRecorrencia(
        supabase,
        {
          escritorioId: sessao.escritorioId,
          atividadeTipo: "monitoramento",
          processoId,
          tipoAtividadeId: tipo.id,
          titulo: texto(formData, "titulo") || null,
          descricao: null,
          responsavelId: sessao.membro.id,
          prioridadeManual: "media",
          diasAntesVisivelCustom: null,
          hora: null,
          local: null,
          duracaoEstimadaMin: null,
          alvo: texto(formData, "alvo") || null,
          regra: r.regra,
        },
        hojeNoBrasil(),
      );
    } catch (e) {
      voltarComErro(
        "monitoramento",
        processoId,
        e instanceof Error ? e.message : "Falha ao salvar a recorrência.",
      );
    }
    redirect("/recorrencias?criada=1");
  }

  try {
    await criarMonitoramento(supabase, {
      escritorioId: sessao.escritorioId,
      processoId,
      tipoAtividadeId: tipo.id,
      titulo: texto(formData, "titulo") || null,
      responsavelId: sessao.membro.id,
      data,
      alvo: texto(formData, "alvo") || null,
    });
  } catch (e) {
    voltarComErro(
        "monitoramento",
        processoId,
      e instanceof Error ? e.message : "Falha ao salvar.",
    );
  }
  redirect("/agenda?lancado=1");
}
