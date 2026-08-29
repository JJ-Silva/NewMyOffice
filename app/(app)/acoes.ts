"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { COOKIE_ESCRITORIO_ATIVO } from "@/lib/supabase/sessao";

// Encerra a sessão e limpa o escritório ativo.
export async function sair() {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut();
  (await cookies()).delete(COOKIE_ESCRITORIO_ATIVO);
  redirect("/login");
}
