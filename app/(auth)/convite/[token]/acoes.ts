"use server";

import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { aceitarConvite } from "@/lib/db/convites";
import { definirEscritorioAtivo } from "@/lib/supabase/sessao";

function voltarComErro(token: string, mensagem: string): never {
  redirect(`/convite/${token}?erro=` + encodeURIComponent(mensagem));
}

// Aceita o convite (RPC cria o membro) e já entra no escritório novo.
export async function aceitar(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  if (!token) {
    redirect("/login");
  }

  const supabase = await criarClienteServidor();
  await concluirAceite(supabase, token);
}

// Cria a conta (nome + senha) e já aceita o convite. Para quem ainda não tem
// login. O e-mail vem travado do próprio convite.
export async function criarContaEAceitar(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  const nome = String(formData.get("nome") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");
  const confirmar = String(formData.get("confirmar") ?? "");

  if (!token) redirect("/login");
  if (!nome || !email || !senha) {
    voltarComErro(token, "Preencha seu nome, o e-mail e a senha.");
  }
  if (senha.length < 6) {
    voltarComErro(token, "A senha precisa de pelo menos 6 caracteres.");
  }
  if (senha !== confirmar) {
    voltarComErro(token, "As duas senhas não são iguais.");
  }

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: { data: { nome } },
  });

  if (error) {
    voltarComErro(
      token,
      error.message.includes("already registered")
        ? "Já existe uma conta com esse e-mail. Use “Já tenho conta”."
        : "Não foi possível criar a conta. Confira os dados.",
    );
  }
  if (!data.session) {
    voltarComErro(token, "Conta criada. Confirme o e-mail e volte a este link.");
  }

  await concluirAceite(supabase, token);
}

async function concluirAceite(
  supabase: Awaited<ReturnType<typeof criarClienteServidor>>,
  token: string,
): Promise<never> {
  let escritorioId: string;
  try {
    escritorioId = await aceitarConvite(supabase, token);
  } catch (e) {
    voltarComErro(
      token,
      e instanceof Error ? e.message : "Não foi possível aceitar o convite.",
    );
  }
  await definirEscritorioAtivo(escritorioId);
  redirect("/agenda");
}
