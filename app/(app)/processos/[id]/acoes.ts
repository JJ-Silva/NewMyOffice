"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { exigirSessao, exigirPermissao } from "@/lib/supabase/sessao";
import type { Permissao } from "@/lib/domain/permissoes";
import { analisarCnj } from "@/lib/domain/cnj";
import {
  atualizarProcessoJudicial,
  atualizarProcessoAdministrativo,
  excluirProcesso,
} from "@/lib/db/processos";
import {
  garantirTribunalDoCnj,
  garantirTribunalPorCodigo,
} from "@/lib/db/tribunais";

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

async function ctx(permissao: Permissao) {
  const sessao = await exigirSessao();
  exigirPermissao(sessao, permissao);
  const supabase = await criarClienteServidor();
  return { sessao, supabase };
}

export async function salvarJudicial(formData: FormData) {
  const { sessao, supabase } = await ctx("processos.editar");
  const id = txt(formData, "id");
  if (!id) return;

  const numero = txt(formData, "numero");
  if (!numero) {
    redirect(
      `/processos/${id}?erro=` +
        encodeURIComponent("Informe o número do processo."),
    );
  }

  const analise = analisarCnj(numero);
  const cnj = analise.ok ? analise.cnj : null;

  let tribunalId: string | null;
  if (cnj) {
    tribunalId = await garantirTribunalDoCnj(
      supabase,
      sessao.escritorioId,
      cnj.partes,
    );
  } else {
    const codigo = Number(txt(formData, "tribunal_codigo"));
    if (!Number.isInteger(codigo) || codigo < 100) {
      redirect(
        `/processos/${id}?erro=` +
          encodeURIComponent(
            "Número fora do padrão CNJ — escolha o tribunal na lista.",
          ),
      );
    }
    tribunalId = await garantirTribunalPorCodigo(
      supabase,
      sessao.escritorioId,
      codigo,
    );
  }

  try {
    await atualizarProcessoJudicial(supabase, id, {
      poloCliente: polo(txt(formData, "polo")),
      status: statusProc(txt(formData, "status")),
      observacoes: txt(formData, "observacoes") || null,
      numero: cnj ? cnj.formatado : numero,
      cnjFormatado: cnj?.formatado ?? null,
      cnjPartes: cnj?.partes ?? null,
      digitoConfere: cnj?.digitoConfere ?? null,
      justica: cnj?.justica ?? null,
      tribunalId,
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
  const { supabase } = await ctx("processos.editar");
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
  const { supabase } = await ctx("processos.excluir");
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
