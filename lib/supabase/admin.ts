// Client Supabase com a service_role key — IGNORA a RLS.
//
// Uso EXCLUSIVO: rotinas de servidor sem usuário logado (o cron diário do DJEN).
// Nunca importar isto em Server Component / Server Action de tela — lá vale a
// RLS pela sessão do usuário (lib/supabase/server.ts).
//
// A chave vive só no servidor (env SUPABASE_SERVICE_ROLE_KEY, sem NEXT_PUBLIC).

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function criarClienteAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) {
    throw new Error(
      "Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY para o cliente admin.",
    );
  }
  return createClient(url, chave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
