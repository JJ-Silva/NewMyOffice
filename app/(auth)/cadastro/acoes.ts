"use server";

import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { criarEscritorioComOnboarding } from "@/lib/db/escritorios";
import { definirEscritorioAtivo } from "@/lib/supabase/sessao";

function voltarComErro(mensagem: string): never {
  redirect("/cadastro?erro=" + encodeURIComponent(mensagem));
}

// Cria a conta (Supabase Auth) e, em seguida, o escritório do usuário
// (função onboarding_criar_escritorio — cria membro dono, config e catálogos).
// Confirmação de e-mail está desativada no projeto, então a sessão já vem pronta.
export async function criarConta(formData: FormData) {
  const nomeEscritorio = String(formData.get("nome_escritorio") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");

  if (!nomeEscritorio || !email || !senha) {
    voltarComErro("Preencha nome do escritório, e-mail e senha.");
  }
  if (senha.length < 6) {
    voltarComErro("A senha precisa de pelo menos 6 caracteres.");
  }

  const supabase = await criarClienteServidor();

  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
  });

  if (error) {
    voltarComErro(
      error.message.includes("already registered")
        ? "Já existe uma conta com esse e-mail. Tente entrar."
        : "Não foi possível criar a conta. Confira os dados.",
    );
  }
  if (!data.session) {
    // Só acontece se a confirmação de e-mail for reativada no projeto.
    voltarComErro(
      "Conta criada. Confirme o e-mail antes de entrar.",
    );
  }

  const escritorioId = await criarEscritorioComOnboarding(
    supabase,
    nomeEscritorio,
  );
  await definirEscritorioAtivo(escritorioId);

  redirect("/agenda");
}
