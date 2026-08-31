"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { exigirSessao } from "@/lib/supabase/sessao";
import { analisarCnj } from "@/lib/domain/cnj";
import {
  atualizarProcessoJudicial,
  atualizarProcessoAdministrativo,
  excluirProcesso,
} from "@/lib/db/processos";

function txt(fd: FormData, k: string): string {
  return String(fd.get(k) ?? "").trim();
}
function numOuNull(v: string): number | null {
  if (!v) return null;
  const n = Number(v.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
function polo(v: string): "autor" | "reu" | "terceiro" | null {
  return v === "autor" || v === "reu" || v === "terceiro" ? v : null;
}
function statusProc(v: string): string {
  return ["ativo", "suspenso", "arquivado", "encerrado"].includes(v)
    ? v
    : "ativo";
}
function esfera(v: string): "federal" | "estadual" | "municipal" | null {
  return v === "federal" || v === "estadual" || v === "municipal" ? v : null;
}

async function ctx() {
  await exigirSessao();
  const supabase = await criarClienteServidor();
  return { supabase };
}

export async function salvarJudicial(formData: FormData) {
  const { supabase } = await ctx();
  const id = txt(formData, "id");
  if (!id) return;

  const analise = analisarCnj(txt(formData, "cnj"));
  if (!analise.ok) {
    redirect(`/processos/${id}?erro=` + encodeURIComponent(analise.erro));
  }

  try {
    await atualizarProcessoJudicial(supabase, id, {
      poloCliente: polo(txt(formData, "polo")),
      status: statusProc(txt(formData, "status")),
      observacoes: txt(formData, "observacoes") || null,
      cnjFormatado: analise.cnj.formatado,
      cnjPartes: analise.cnj.partes,
      digitoConfere: analise.cnj.digitoConfere,
      justica: analise.cnj.justica,
      tribunalId: txt(formData, "tribunal") || null,
      vara: txt(formData, "vara") || null,
      comarca: txt(formData, "comarca") || null,
      instancia: txt(formData, "instancia") || null,
      tipoAcao: txt(formData, "tipo_acao") || null,
      juizo: txt(formData, "juizo") || null,
      fase: txt(formData, "fase") || null,
      valorCausa: numOuNull(txt(formData, "valor_causa")),
      dataDistribuicao: txt(formData, "data_distribuicao") || null,
    });
  } catch (e) {
    redirect(
      `/processos/${id}?erro=` +
        encodeURIComponent(
          e instanceof Error ? e.message : "Falha ao salvar.",
        ),
    );
  }

  revalidatePath(`/processos/${id}`);
  revalidatePath("/processos");
  redirect("/processos?salvo=1");
}

export async function salvarAdministrativo(formData: FormData) {
  const { supabase } = await ctx();
  const id = txt(formData, "id");
  if (!id) return;

  try {
    await atualizarProcessoAdministrativo(supabase, id, {
      poloCliente: polo(txt(formData, "polo")),
      status: statusProc(txt(formData, "status")),
      observacoes: txt(formData, "observacoes") || null,
      numeroAdm: txt(formData, "numero_adm") || null,
      orgaoJulgador: txt(formData, "orgao_julgador") || null,
      secretaria: txt(formData, "secretaria") || null,
      esfera: esfera(txt(formData, "esfera")),
      tipo: txt(formData, "tipo") || null,
      assunto: txt(formData, "assunto") || null,
      autoridadeCompetente: txt(formData, "autoridade_competente") || null,
      protocolo: txt(formData, "protocolo") || null,
      dataProtocolo: txt(formData, "data_protocolo") || null,
      fase: txt(formData, "fase") || null,
    });
  } catch (e) {
    redirect(
      `/processos/${id}?erro=` +
        encodeURIComponent(
          e instanceof Error ? e.message : "Falha ao salvar.",
        ),
    );
  }

  revalidatePath(`/processos/${id}`);
  revalidatePath("/processos");
  redirect("/processos?salvo=1");
}

export async function excluir(formData: FormData) {
  const { supabase } = await ctx();
  const id = txt(formData, "id");
  if (!id) return;
  if (txt(formData, "confirmacao") !== "EXCLUIR") {
    redirect(
      `/processos/${id}?erro=` +
        encodeURIComponent("Digite EXCLUIR para confirmar."),
    );
  }
  await excluirProcesso(supabase, id);
  redirect("/processos?excluido=1");
}
