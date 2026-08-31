"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { exigirSessao, exigirPermissao } from "@/lib/supabase/sessao";
import { hojeNoBrasil } from "@/lib/hoje";
import {
  encerrarRecorrencia,
  excluirRecorrencia,
} from "@/lib/db/recorrencias";

function txt(fd: FormData, k: string): string {
  return String(fd.get(k) ?? "").trim();
}

// Encerrar: para de gerar; remove as instâncias futuras ainda pendentes.
export async function encerrarRecorrenciaAction(formData: FormData) {
  const sessao = await exigirSessao();
  exigirPermissao(sessao, "recorrencias.gerenciar");
  const supabase = await criarClienteServidor();
  const id = txt(formData, "id");
  if (!id) return;
  await encerrarRecorrencia(supabase, sessao.escritorioId, id, hojeNoBrasil());
  revalidatePath("/recorrencias");
  revalidatePath("/agenda");
}

// Excluir: régua criada errada. Some da lista + limpa as pendentes de hoje
// em diante. O que já foi concluído fica.
export async function excluirRecorrenciaAction(formData: FormData) {
  const sessao = await exigirSessao();
  exigirPermissao(sessao, "recorrencias.gerenciar");
  const supabase = await criarClienteServidor();
  const id = txt(formData, "id");
  if (!id) return;
  if (txt(formData, "confirmacao") !== "EXCLUIR") {
    redirect(
      "/recorrencias?erro=" +
        encodeURIComponent("Digite EXCLUIR para confirmar."),
    );
  }
  await excluirRecorrencia(supabase, sessao.escritorioId, id, hojeNoBrasil());
  revalidatePath("/recorrencias");
  revalidatePath("/agenda");
}
