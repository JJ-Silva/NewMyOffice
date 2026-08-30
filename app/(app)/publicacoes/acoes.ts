"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { exigirSessao } from "@/lib/supabase/sessao";
import { hojeNoBrasil } from "@/lib/hoje";
import { somarDias } from "@/lib/domain/datas";
import { listarOabs } from "@/lib/db/oab";
import { buscarComunicacoes } from "@/lib/djen/comunica-api";
import {
  salvarComunicacoes,
  descartarPublicacao,
  reabrirPublicacao,
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
    const comunicacoes = await buscarComunicacoes({
      oabs: oabs.map((o) => ({ numero: o.numero, uf: o.uf })),
      dataInicio,
      dataFim,
    });
    resultado = await salvarComunicacoes(
      supabase,
      sessao.escritorioId,
      comunicacoes,
    );
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

export async function descartar(formData: FormData) {
  const { sessao, supabase } = await ctx();
  const id = txt(formData, "id");
  if (!id) return;
  await descartarPublicacao(supabase, {
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
