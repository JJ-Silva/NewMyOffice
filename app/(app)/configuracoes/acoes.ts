"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { exigirSessao } from "@/lib/supabase/sessao";
import { podeFazer } from "@/lib/domain/autorizacao";
import {
  criarTribunal,
  excluirTribunal,
} from "@/lib/db/tribunais";
import { criarFeriado, excluirFeriado } from "@/lib/db/feriados";
import {
  criarPeriodoNaoUtil,
  excluirPeriodoNaoUtil,
} from "@/lib/db/periodos-nao-uteis";
import { adicionarOab, excluirOab } from "@/lib/db/oab";
import {
  criarTipoDeAtividade,
  atualizarTipoDeAtividade,
  excluirTipoDeAtividade,
  type CamposTipoAtividade,
} from "@/lib/db/tipos-atividade";

// Todas as ações de Configurações passam por aqui: exigem sessão e o papel
// `dono` (decisão P6 — só o administrador mexe em tribunais/feriados).
async function contextoAutorizado() {
  const sessao = await exigirSessao();
  if (!podeFazer(sessao.membro, "acessar_configuracoes")) {
    redirect("/agenda");
  }
  const supabase = await criarClienteServidor();
  return { sessao, supabase };
}

function texto(formData: FormData, campo: string): string {
  return String(formData.get(campo) ?? "").trim();
}

// ── Tribunais ───────────────────────────────────────────────────────────────
export async function adicionarTribunal(formData: FormData) {
  const { sessao, supabase } = await contextoAutorizado();
  const nome = texto(formData, "nome");
  const sigla = texto(formData, "sigla");
  if (!nome || !sigla) {
    return;
  }
  await criarTribunal(supabase, {
    escritorioId: sessao.escritorioId,
    nome,
    sigla,
  });
  revalidatePath("/configuracoes");
}

export async function removerTribunal(formData: FormData) {
  const { supabase } = await contextoAutorizado();
  const id = texto(formData, "id");
  if (id) {
    await excluirTribunal(supabase, id);
    revalidatePath("/configuracoes");
  }
}

// ── Feriados ────────────────────────────────────────────────────────────────
export async function adicionarFeriado(formData: FormData) {
  const { sessao, supabase } = await contextoAutorizado();
  const data = texto(formData, "data");
  const descricao = texto(formData, "descricao");
  const tribunalIds = formData.getAll("tribunal_ids").map(String);
  if (!data || !descricao) {
    return;
  }
  await criarFeriado(supabase, {
    escritorioId: sessao.escritorioId,
    data,
    descricao,
    repeteTodoAno: formData.get("repete_todo_ano") === "on",
    tribunalIds,
  });
  revalidatePath("/configuracoes");
}

export async function removerFeriado(formData: FormData) {
  const { supabase } = await contextoAutorizado();
  const id = texto(formData, "id");
  if (id) {
    await excluirFeriado(supabase, id);
    revalidatePath("/configuracoes");
  }
}

// ── Períodos não úteis (recesso) ────────────────────────────────────────────
export async function adicionarPeriodoNaoUtil(formData: FormData) {
  const { sessao, supabase } = await contextoAutorizado();
  const dataInicio = texto(formData, "data_inicio");
  const dataFim = texto(formData, "data_fim");
  const descricao = texto(formData, "descricao");
  const tribunalIds = formData.getAll("tribunal_ids").map(String);
  if (!dataInicio || !dataFim || !descricao) {
    return;
  }
  await criarPeriodoNaoUtil(supabase, {
    escritorioId: sessao.escritorioId,
    dataInicio,
    dataFim,
    descricao,
    repeteTodoAno: formData.get("repete_todo_ano") === "on",
    tribunalIds,
  });
  revalidatePath("/configuracoes");
}

export async function removerPeriodoNaoUtil(formData: FormData) {
  const { supabase } = await contextoAutorizado();
  const id = texto(formData, "id");
  if (id) {
    await excluirPeriodoNaoUtil(supabase, id);
    revalidatePath("/configuracoes");
  }
}

// ── OABs monitoradas (DJEN) ────────────────────────────────────────────────
export async function adicionarOabAction(formData: FormData) {
  const { sessao, supabase } = await contextoAutorizado();
  const numero = texto(formData, "numero");
  const uf = texto(formData, "uf");
  if (!numero || !uf) return;
  try {
    await adicionarOab(supabase, {
      escritorioId: sessao.escritorioId,
      numero,
      uf,
      nomeAdvogado: texto(formData, "nome_advogado") || null,
    });
  } catch (e) {
    redirect(
      "/configuracoes?erro=" +
        encodeURIComponent(
          e instanceof Error ? e.message : "Falha ao adicionar a OAB.",
        ),
    );
  }
  revalidatePath("/configuracoes");
}

export async function removerOabAction(formData: FormData) {
  const { supabase } = await contextoAutorizado();
  const id = texto(formData, "id");
  if (id) {
    await excluirOab(supabase, id);
    revalidatePath("/configuracoes");
  }
}

// ── Catálogo: tipos de atividade (prazo / compromisso / monitoramento) ──────
function lerCamposTipo(formData: FormData): CamposTipoAtividade {
  const aplicaARaw = texto(formData, "aplica_a");
  const aplicaA =
    aplicaARaw === "compromisso" || aplicaARaw === "monitoramento"
      ? aplicaARaw
      : "prazo";
  const naturezaRaw = texto(formData, "natureza");
  const dias = parseInt(texto(formData, "dias_padrao"), 10);
  return {
    nome: texto(formData, "nome"),
    aplicaA,
    diasPadrao: Number.isFinite(dias) && dias > 0 ? dias : null,
    natureza:
      naturezaRaw === "processual" ||
      naturezaRaw === "material" ||
      naturezaRaw === "interna"
        ? naturezaRaw
        : null,
    exigePeca: formData.get("exige_peca") === "1",
    categoria: texto(formData, "categoria") || null,
  };
}

export async function adicionarTipoAtividadeAction(formData: FormData) {
  const { sessao, supabase } = await contextoAutorizado();
  const campos = lerCamposTipo(formData);
  if (!campos.nome) return;
  try {
    await criarTipoDeAtividade(supabase, sessao.escritorioId, campos);
  } catch (e) {
    redirect(
      "/configuracoes?erro=" +
        encodeURIComponent(e instanceof Error ? e.message : "Falha ao criar."),
    );
  }
  revalidatePath("/configuracoes");
  revalidatePath("/", "layout"); // o nome do tipo aparece na agenda, no lançamento, etc.
}

export async function editarTipoAtividadeAction(formData: FormData) {
  const { supabase } = await contextoAutorizado();
  const id = texto(formData, "id");
  const campos = lerCamposTipo(formData);
  if (!id || !campos.nome) return;
  try {
    await atualizarTipoDeAtividade(supabase, id, campos);
  } catch (e) {
    redirect(
      "/configuracoes?erro=" +
        encodeURIComponent(
          e instanceof Error ? e.message : "Falha ao atualizar.",
        ),
    );
  }
  revalidatePath("/configuracoes");
  revalidatePath("/", "layout"); // o nome do tipo aparece na agenda, no lançamento, etc.
}

export async function removerTipoAtividadeAction(formData: FormData) {
  const { supabase } = await contextoAutorizado();
  const id = texto(formData, "id");
  if (id) {
    await excluirTipoDeAtividade(supabase, id);
    revalidatePath("/configuracoes");
  revalidatePath("/", "layout"); // o nome do tipo aparece na agenda, no lançamento, etc.
  }
}
