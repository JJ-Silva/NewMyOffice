"use server";

import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { usuarioLogado, definirEscritorioAtivo } from "@/lib/supabase/sessao";
import { listarMembrosDoUsuario } from "@/lib/db/membros";

// Define qual escritório fica ativo na sessão. Só aceita um escritório
// em que o usuário é membro ativo.
export async function trocarEscritorio(formData: FormData) {
  const escritorioId = String(formData.get("escritorio_id") ?? "");

  const usuario = await usuarioLogado();
  if (!usuario) {
    redirect("/login");
  }

  const supabase = await criarClienteServidor();
  const membros = await listarMembrosDoUsuario(supabase, usuario.id);
  const ehMembro = membros.some((m) => m.escritorio_id === escritorioId);

  if (!ehMembro) {
    redirect(
      "/trocar-escritorio?erro=" +
        encodeURIComponent("Escritório inválido."),
    );
  }

  await definirEscritorioAtivo(escritorioId);
  redirect("/agenda");
}
