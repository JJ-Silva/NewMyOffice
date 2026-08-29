// Acesso a dados: escritório.
// A criação passa pela função SQL `onboarding_criar_escritorio` (migration 07),
// que roda como security definer e, numa transação, cria:
//   escritorio + membro (papel dono) + configuracao_escritorio
//   + copia os catálogos padrão (area, tipo_atividade).

import type { SupabaseClient } from "@supabase/supabase-js";

// Cria o escritório do usuário logado. Retorna o id do escritório novo.
export async function criarEscritorioComOnboarding(
  supabase: SupabaseClient,
  nome: string,
): Promise<string> {
  const { data, error } = await supabase.rpc("onboarding_criar_escritorio", {
    p_nome: nome,
  });

  if (error) {
    throw new Error(`Falha ao criar o escritório: ${error.message}`);
  }

  return data as string;
}
