"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { exigirSessao } from "@/lib/supabase/sessao";
import { hojeNoBrasil } from "@/lib/hoje";
import { somarDias } from "@/lib/domain/datas";
import { listarOabs } from "@/lib/db/oab";
import { sincronizarEscritorio } from "@/lib/djen/sincronizar";
import {
  arquivarPublicacao,
  reabrirPublicacao,
  vincularProcessoNaPublicacao,
} from "@/lib/db/publicacoes";

function txt(fd: FormData, k: string): string {
  return String(fd.get(k) ?? "").trim();
}

async function ctx() {
  const sessao = await exigirSessao();
  const supabase = await criarClienteServidor();
  return { sessao, supabase };
}

// Busca no DJEN as publicações das OABs do escritório no período e grava as novas.
export async function buscarNoDjen(formData: FormData) {
  const { sessao, supabase } = await ctx();

  const hoje = hojeNoBrasil();
  const dataInicio = txt(formData, "data_inicio") || somarDias(hoje, -7);
  const dataFim = txt(formData, "data_fim") || hoje;

  const oabs = (await listarOabs(supabase, sessao.escritorioId)).filter(
    (o) => o.ativo,
  );
  if (oabs.length === 0) {
    redirect(
      "/publicacoes?erro=" +
        encodeURIComponent(
          "Cadastre uma OAB em Configurações antes de buscar.",
        ),
    );
  }

  let resultado: { novas: number; jaExistiam: number };
  try {
    resultado = await sincronizarEscritorio(supabase, sessao.escritorioId, {
      dataInicio,
      dataFim,
    });
  } catch (e) {
    redirect(
      "/publicacoes?erro=" +
        encodeURIComponent(
          e instanceof Error ? e.message : "Falha na busca do DJEN.",
        ),
    );
  }

  revalidatePath("/publicacoes");
  redirect(
    `/publicacoes?novas=${resultado.novas}&repetidas=${resultado.jaExistiam}`,
  );
}

export async function arquivar(formData: FormData) {
  const { sessao, supabase } = await ctx();
  const id = txt(formData, "id");
  if (!id) return;
  await arquivarPublicacao(supabase, {
    id,
    membroId: sessao.membro.id,
    motivo: txt(formData, "motivo") || null,
  });
  revalidatePath("/publicacoes");
  revalidatePath(`/publicacoes/${id}`);
}

export async function reabrir(formData: FormData) {
  const { supabase } = await ctx();
  const id = txt(formData, "id");
  if (!id) return;
  await reabrirPublicacao(supabase, id);
  revalidatePath("/publicacoes");
  revalidatePath(`/publicacoes/${id}`);
}

// Vincula a publicação a um PROCESSO JUDICIAL já cadastrado (para o caso em que
// o casamento automático por CNJ falhou). Publicação do DJEN só se liga a
// processo judicial — nunca ao "geral" de uma pasta.
export async function vincularProcessoJudicial(formData: FormData) {
  const { sessao, supabase } = await ctx();
  const id = txt(formData, "id");
  const processoId = txt(formData, "processo_id");
  if (!id || !processoId) return;

  const { data } = await supabase
    .from("processo")
    .select("id")
    .eq("id", processoId)
    .eq("escritorio_id", sessao.escritorioId)
    .eq("tipo", "judicial")
    .is("deletado_em", null)
    .maybeSingle();
  if (!data) {
    redirect(
      `/publicacoes/${id}?erro=` +
        encodeURIComponent("Processo judicial inválido."),
    );
  }

  await vincularProcessoNaPublicacao(supabase, id, processoId);
  revalidatePath(`/publicacoes/${id}`);
}
