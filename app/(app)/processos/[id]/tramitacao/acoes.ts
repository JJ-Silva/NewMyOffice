"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { exigirSessao, exigirPermissao } from "@/lib/supabase/sessao";
import { criarAndamentoManual } from "@/lib/db/andamentos";

// Posta uma anotação manual no fio de um processo. O id do processo vem por
// .bind() (não do formulário) — a tela da tramitação de processo é de 1 só.
export async function postarAndamentoNoProcesso(
  processoId: string,
  formData: FormData,
) {
  const sessao = await exigirSessao();
  exigirPermissao(sessao, "tramitacao.criar");

  const texto = String(formData.get("texto") ?? "").trim();
  if (!texto) return;

  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("processo")
    .select("id")
    .eq("id", processoId)
    .eq("escritorio_id", sessao.escritorioId)
    .is("deletado_em", null)
    .maybeSingle();
  if (!data) return;

  await criarAndamentoManual(supabase, {
    escritorioId: sessao.escritorioId,
    processoId,
    autorMembroId: sessao.membro.id,
    texto,
  });
  revalidatePath(`/processos/${processoId}/tramitacao`);
}
