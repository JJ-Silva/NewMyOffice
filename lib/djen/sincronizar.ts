// Junta as peças: OABs do escritório → busca no DJEN → grava as novas.
// Usado pela ação manual ("Buscar no DJEN") e pelo cron diário.

import type { SupabaseClient } from "@supabase/supabase-js";
import { listarOabs } from "@/lib/db/oab";
import { buscarComunicacoes } from "@/lib/djen/comunica-api";
import { salvarComunicacoes } from "@/lib/db/publicacoes";

export type ResultadoSincronizacao = { novas: number; jaExistiam: number };

// Sincroniza um escritório num período. Sem OAB ativa → não faz nada.
export async function sincronizarEscritorio(
  supabase: SupabaseClient,
  escritorioId: string,
  periodo: { dataInicio: string; dataFim: string },
): Promise<ResultadoSincronizacao> {
  const oabs = (await listarOabs(supabase, escritorioId)).filter((o) => o.ativo);
  if (oabs.length === 0) return { novas: 0, jaExistiam: 0 };

  const comunicacoes = await buscarComunicacoes({
    oabs: oabs.map((o) => ({ numero: o.numero, uf: o.uf })),
    dataInicio: periodo.dataInicio,
    dataFim: periodo.dataFim,
  });
  return salvarComunicacoes(supabase, escritorioId, comunicacoes);
}

// Todos os escritórios que têm ao menos uma OAB ativa. Só faz sentido com um
// client admin (o cron não tem sessão de usuário).
export async function escritoriosComOabAtiva(
  supabaseAdmin: SupabaseClient,
): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from("oab_monitorada")
    .select("escritorio_id")
    .eq("ativo", true)
    .is("deletado_em", null);
  if (error) {
    throw new Error(`Falha ao listar escritórios com OAB: ${error.message}`);
  }
  return [...new Set((data ?? []).map((r) => r.escritorio_id as string))];
}
