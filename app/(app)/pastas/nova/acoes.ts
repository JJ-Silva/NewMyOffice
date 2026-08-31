"use server";

import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { exigirSessao, exigirPermissao } from "@/lib/supabase/sessao";
import { criarPasta } from "@/lib/db/pastas";
import { lerRetorno, anexarId } from "@/lib/navegacao";

export async function criarPastaAction(formData: FormData) {
  const sessao = await exigirSessao();
  exigirPermissao(sessao, "pastas.criar");

  const clienteId = String(formData.get("cliente_id") ?? "").trim();
  const nome = String(formData.get("nome") ?? "").trim() || null;
  const areaId = String(formData.get("area_id") ?? "").trim() || null;
  const objetivo = String(formData.get("objetivo") ?? "").trim() || null;
  const objeto = String(formData.get("objeto") ?? "").trim() || null;
  const retorno = lerRetorno(String(formData.get("retorno") ?? ""));

  // Erro volta pra cá preservando a cadeia e o cliente escolhido.
  function voltarComErro(mensagem: string): never {
    const p = new URLSearchParams({ erro: mensagem });
    if (clienteId) p.set("cliente", clienteId);
    if (retorno) p.set("retorno", retorno);
    redirect(`/pastas/nova?${p.toString()}`);
  }

  if (!clienteId) {
    voltarComErro("Escolha o cliente da pasta.");
  }

  const supabase = await criarClienteServidor();

  let pastaId: string;
  try {
    const criada = await criarPasta(supabase, {
      escritorioId: sessao.escritorioId,
      nome,
      areaId,
      objetivo,
      objeto,
      clienteIds: [clienteId],
    });
    pastaId = criada.id;
  } catch (e) {
    voltarComErro(e instanceof Error ? e.message : "Falha ao criar a pasta.");
  }

  // Veio de outro cadastro (encadeamento) → volta pra lá com a pasta pronta.
  if (retorno) {
    redirect(anexarId(retorno, "pasta", pastaId));
  }

  redirect(`/pastas?criada=${pastaId}`);
}
