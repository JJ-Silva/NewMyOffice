"use server";

import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { exigirSessao, exigirPermissao } from "@/lib/supabase/sessao";
import { criarCliente, type TipoPessoa } from "@/lib/db/clientes";
import { lerRetorno, anexarId } from "@/lib/navegacao";

function voltarComErro(mensagem: string): never {
  redirect("/clientes/novo?erro=" + encodeURIComponent(mensagem));
}

// Cria o cliente e segue para a criação da pasta (fluxo guiado do protótipo:
// "Salvar e criar pasta").
export async function criarClienteESeguir(formData: FormData) {
  const sessao = await exigirSessao();
  exigirPermissao(sessao, "clientes.criar");

  const nome = String(formData.get("nome") ?? "").trim();
  const cpfCnpj = String(formData.get("cpf_cnpj") ?? "").trim();
  const tipoPessoa = String(formData.get("tipo_pessoa") ?? "") as TipoPessoa;
  const telefone = String(formData.get("telefone") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;

  if (!nome || !cpfCnpj) {
    voltarComErro("Informe o nome e o CPF/CNPJ.");
  }
  if (tipoPessoa !== "fisica" && tipoPessoa !== "juridica") {
    voltarComErro("Escolha se é pessoa física ou jurídica.");
  }

  const supabase = await criarClienteServidor();

  let clienteId: string;
  try {
    clienteId = await criarCliente(supabase, {
      escritorioId: sessao.escritorioId,
      nome,
      cpfCnpj,
      tipoPessoa,
      telefone,
      email,
    });
  } catch (e) {
    voltarComErro(e instanceof Error ? e.message : "Falha ao criar o cliente.");
  }

  // Veio de outro cadastro (encadeamento) → volta pra lá com o cliente pronto.
  const retorno = lerRetorno(String(formData.get("retorno") ?? ""));
  if (retorno) {
    redirect(anexarId(retorno, "cliente", clienteId));
  }

  redirect(`/pastas/nova?cliente=${clienteId}`);
}
