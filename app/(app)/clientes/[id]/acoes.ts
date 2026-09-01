"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { exigirSessao, exigirPermissao } from "@/lib/supabase/sessao";
import {
  atualizarCliente,
  excluirCliente,
  type TipoPessoa,
} from "@/lib/db/clientes";

function txt(fd: FormData, k: string): string {
  return String(fd.get(k) ?? "").trim();
}

export async function salvarCliente(formData: FormData) {
  const sessao = await exigirSessao();
  exigirPermissao(sessao, "clientes.editar");
  const id = txt(formData, "id");
  if (!id) return;

  const tipoRaw = txt(formData, "tipo_pessoa");
  const tipoPessoa: TipoPessoa = tipoRaw === "juridica" ? "juridica" : "fisica";

  const supabase = await criarClienteServidor();
  try {
    await atualizarCliente(supabase, id, {
      nome: txt(formData, "nome"),
      cpfCnpj: txt(formData, "cpf_cnpj"),
      tipoPessoa,
      telefone: txt(formData, "telefone") || null,
      email: txt(formData, "email") || null,
    });
  } catch (e) {
    redirect(
      `/clientes/${id}?erro=` +
        encodeURIComponent(e instanceof Error ? e.message : "Falha ao salvar."),
    );
  }

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  redirect(`/clientes/${id}?salvo=1`);
}

export async function excluirClienteAction(formData: FormData) {
  const sessao = await exigirSessao();
  exigirPermissao(sessao, "clientes.excluir");
  const id = txt(formData, "id");
  if (!id) return;
  if (txt(formData, "confirmacao") !== "EXCLUIR") {
    redirect(
      `/clientes/${id}?erro=` + encodeURIComponent("Digite EXCLUIR para confirmar."),
    );
  }

  const supabase = await criarClienteServidor();
  try {
    await excluirCliente(supabase, sessao.escritorioId, id);
  } catch (e) {
    redirect(
      `/clientes/${id}?erro=` +
        encodeURIComponent(e instanceof Error ? e.message : "Falha ao excluir."),
    );
  }

  revalidatePath("/clientes");
  redirect("/clientes?excluido=1");
}
