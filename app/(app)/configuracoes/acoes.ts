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
