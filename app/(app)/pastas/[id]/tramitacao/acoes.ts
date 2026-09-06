"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { exigirSessao, exigirPermissao } from "@/lib/supabase/sessao";
import { criarAndamentoManual } from "@/lib/db/andamentos";

// Posta uma anotação manual no fio de uma pasta. Como a pasta agrega vários
// processos, o formulário diz em qual processo entra (default: o "geral").
export async function postarAndamentoNaPasta(
  pastaId: string,
  formData: FormData,
) {
  const sessao = await exigirSessao();
  exigirPermissao(sessao, "tramitacao.criar");

  const texto = String(formData.get("texto") ?? "").trim();
  const processoId = String(formData.get("processo_id") ?? "").trim();
  if (!texto || !processoId) return;

  const supabase = await criarClienteServidor();
  // o processo tem de ser desta pasta e deste escritório
  const { data } = await supabase
    .from("processo")
    .select("id, pasta_id")
    .eq("id", processoId)
    .eq("escritorio_id", sessao.escritorioId)
    .is("deletado_em", null)
    .maybeSingle();
  if (!data || data.pasta_id !== pastaId) return;

  await criarAndamentoManual(supabase, {
    escritorioId: sessao.escritorioId,
    processoId,
    autorMembroId: sessao.membro.id,
    texto,
  });
  revalidatePath(`/pastas/${pastaId}/tramitacao`);
}
