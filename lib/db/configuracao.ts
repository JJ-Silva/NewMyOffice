// Acesso a dados: `configuracao_escritorio` (1:1 com escritório, §3.1).

import type { SupabaseClient } from "@supabase/supabase-js";

export type ConfiguracaoEscritorio = {
  margem_prazo_interno_dias: number;
  agenda_janela_dias: number;
};

export async function carregarConfiguracao(
  supabase: SupabaseClient,
  escritorioId: string,
): Promise<ConfiguracaoEscritorio> {
  const { data, error } = await supabase
    .from("configuracao_escritorio")
    .select("margem_prazo_interno_dias, agenda_janela_dias")
    .eq("escritorio_id", escritorioId)
    .single();

  if (error) {
    throw new Error(`Falha ao carregar a configuração: ${error.message}`);
  }
  return data as ConfiguracaoEscritorio;
}
