// Client Supabase para Server Components e Server Actions.
// Lê/grava a sessão nos cookies da requisição (padrão @supabase/ssr).
//
// Em Server Component puro o Next não deixa gravar cookie durante o render —
// nesse caso o `setAll` falha silenciosamente e quem renova a sessão é o
// middleware (ver middleware.ts). Em Server Action / Route Handler o setAll
// funciona normalmente.

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function criarClienteServidor() {
  const armazemDeCookies = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return armazemDeCookies.getAll();
        },
        setAll(
          cookiesParaGravar: {
            name: string;
            value: string;
            options: CookieOptions;
          }[],
        ) {
          try {
            for (const { name, value, options } of cookiesParaGravar) {
              armazemDeCookies.set(name, value, options);
            }
          } catch {
            // Chamado de dentro de um Server Component — ignorar.
            // O middleware cuida de renovar a sessão.
          }
        },
      },
    },
  );
}
