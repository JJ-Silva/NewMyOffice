"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { exigirSessao } from "@/lib/supabase/sessao";
import {
  atualizarPasta,
  excluirPasta,
  vincularCliente,
  desvincularCliente,
} from "@/lib/db/pastas";
import {
  adicionarParte,
  removerParte,
  type TipoParte,
} from "@/lib/db/partes";

function txt(fd: FormData, k: string): string {
  return String(fd.get(k) ?? "").trim();
}

async function ctx() {
  const sessao = await exigirSessao();
  const supabase = await criarClienteServidor();
  return { sessao, supabase };
}

export async function salvarPasta(formData: FormData) {
  const { supabase } = await ctx();
  const id = txt(formData, "id");
  if (!id) return;
  const statusRaw = txt(formData, "status");
  await atualizarPasta(supabase, id, {
    nome: txt(formData, "nome") || null,
    referenciaExterna: txt(formData, "referencia_externa") || null,
    areaId: txt(formData, "area_id") || null,
    objetivo: txt(formData, "objetivo") || null,
    objeto: txt(formData, "objeto") || null,
    status:
      statusRaw === "arquivada" || statusRaw === "suspensa"
        ? statusRaw
        : "ativa",
  });
  revalidatePath(`/pastas/${id}`);
}

export async function excluirPastaAction(formData: FormData) {
  const { supabase } = await ctx();
  const id = txt(formData, "id");
  const confirmacao = txt(formData, "confirmacao");
  if (!id) return;
  if (confirmacao !== "EXCLUIR") {
    redirect(
      `/pastas/${id}?erro=` +
        encodeURIComponent('Digite EXCLUIR para confirmar.'),
    );
  }
  await excluirPasta(supabase, id);
  redirect("/pastas");
}

export async function adicionarCliente(formData: FormData) {
  const { supabase } = await ctx();
  const id = txt(formData, "id");
  const clienteId = txt(formData, "cliente_id");
  if (!id || !clienteId) return;
  await vincularCliente(supabase, id, clienteId);
  revalidatePath(`/pastas/${id}`);
}

export async function removerCliente(formData: FormData) {
  const { supabase } = await ctx();
  const id = txt(formData, "id");
  const clienteId = txt(formData, "cliente_id");
  if (!id || !clienteId) return;
  await desvincularCliente(supabase, id, clienteId);
  revalidatePath(`/pastas/${id}`);
}

export async function adicionarParteAction(formData: FormData) {
  const { sessao, supabase } = await ctx();
  const pastaId = txt(formData, "pasta_id");
  const processoId = txt(formData, "processo_id");
  const nome = txt(formData, "nome");
  const tipoParte = txt(formData, "tipo_parte") as TipoParte;
  if (!processoId || !nome || !tipoParte) {
    redirect(`/pastas/${pastaId}?erro=` + encodeURIComponent("Informe nome e tipo da parte."));
  }
  await adicionarParte(supabase, {
    escritorioId: sessao.escritorioId,
    processoId,
    nome,
    tipoParte,
    cpfCnpj: txt(formData, "cpf_cnpj") || null,
    advogadoAdverso: txt(formData, "advogado_adverso") || null,
    oabAdverso: txt(formData, "oab_adverso") || null,
  });
  revalidatePath(`/pastas/${pastaId}`);
}

export async function removerParteAction(formData: FormData) {
  const { supabase } = await ctx();
  const pastaId = txt(formData, "pasta_id");
  const parteId = txt(formData, "parte_id");
  if (!parteId) return;
  await removerParte(supabase, parteId);
  revalidatePath(`/pastas/${pastaId}`);
}
