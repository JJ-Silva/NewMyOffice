// Client Supabase para Client Components (roda no navegador).
// Usa a chave pública (anon/publishable) — nunca a service_role.

import { createBrowserClient } from "@supabase/ssr";

export function criarClienteBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
