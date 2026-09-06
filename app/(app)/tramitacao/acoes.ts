"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { exigirSessao, exigirPermissao } from "@/lib/supabase/sessao";
import { criarAndamentoManual } from "@/lib/db/andamentos";

// Posta uma anotação manual no fio. O processo-alvo vem por .bind() da página
// (o processo exibido, ou o "geral" da pasta quando a vista é "Caso inteiro").
export async function postarAndamento(processoId: string, formData: FormData) {
  const sessao = await exigirSessao();
  exigirPermissao(sessao, "tramitacao.criar");

  const texto = String(formData.get("texto") ?? "").trim();
  if (!texto || !processoId) return;

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
  revalidatePath("/tramitacao");
}
