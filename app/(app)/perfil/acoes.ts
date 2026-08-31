"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { exigirSessao } from "@/lib/supabase/sessao";

function voltarComErro(mensagem: string): never {
  redirect("/perfil?erro=" + encodeURIComponent(mensagem));
}

// Muda o nome de exibição. Grava nos DOIS lugares:
//   auth.users.user_metadata.nome  → usado pela sessão (sidebar)
//   public.usuario.nome            → usado nos joins (Equipe, responsável, autor)
export async function salvarNome(formData: FormData) {
  const sessao = await exigirSessao();
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) {
    voltarComErro("Informe como você quer ser chamado.");
  }

  const supabase = await criarClienteServidor();

  const auth = await supabase.auth.updateUser({ data: { nome } });
  if (auth.error) {
    voltarComErro("Não foi possível salvar o nome. Tente de novo.");
  }

  const tabela = await supabase
    .from("usuario")
    .update({ nome })
    .eq("id", sessao.usuario.id);
  if (tabela.error) {
    voltarComErro(`Falha ao salvar: ${tabela.error.message}`);
  }

  revalidatePath("/", "layout"); // o nome aparece na sidebar e em várias telas
  redirect("/perfil?salvo=1");
}

// Troca a senha (com confirmação).
export async function alterarSenha(formData: FormData) {
  await exigirSessao();
  const senha = String(formData.get("senha") ?? "");
  const confirmar = String(formData.get("confirmar") ?? "");

  if (senha.length < 6) {
    voltarComErro("A nova senha precisa de pelo menos 6 caracteres.");
  }
  if (senha !== confirmar) {
    voltarComErro("As duas senhas não são iguais.");
  }

  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.updateUser({ password: senha });
  if (error) {
    voltarComErro(
      error.message.includes("should be different")
        ? "A nova senha precisa ser diferente da atual."
        : "Não foi possível trocar a senha.",
    );
  }

  redirect("/perfil?senha=1");
}
