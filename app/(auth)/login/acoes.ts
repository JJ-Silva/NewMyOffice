"use server";

import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";

// Entra com e-mail e senha (Supabase Auth). Em caso de erro, volta para
// /login?erro=... — a página mostra a mensagem.
export async function entrar(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");

  if (!email || !senha) {
    redirect("/login?erro=" + encodeURIComponent("Informe e-mail e senha."));
  }

  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });

  if (error) {
    redirect(
      "/login?erro=" + encodeURIComponent("E-mail ou senha incorretos."),
    );
  }

  redirect("/agenda");
}
