import type { NextRequest } from "next/server";
import { atualizarSessao } from "@/lib/supabase/proxy";

// Convenção do Next 16 ("proxy" — antigo "middleware"). Roda antes de cada rota.
export async function proxy(request: NextRequest) {
  return atualizarSessao(request);
}

export const config = {
  // Roda em tudo, menos assets estáticos e imagens.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
