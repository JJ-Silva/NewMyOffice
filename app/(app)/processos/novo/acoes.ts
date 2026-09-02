"use server";

import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { exigirSessao, exigirPermissao } from "@/lib/supabase/sessao";
import { analisarCnj } from "@/lib/domain/cnj";
import {
  criarProcessoJudicial,
  criarProcessoAdministrativo,
} from "@/lib/db/processos";
import { garantirTribunalPorCodigo } from "@/lib/db/tribunais";
import { vincularProcessoNaPublicacao } from "@/lib/db/publicacoes";
import { lerRetorno, anexarId } from "@/lib/navegacao";

function txt(fd: FormData, k: string): string {
  return String(fd.get(k) ?? "").trim();
}
function numOuNull(v: string): number | null {
  if (!v) return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
function polo(v: string): "autor" | "reu" | "terceiro" | null {
  return v === "autor" || v === "reu" || v === "terceiro" ? v : null;
}

export async function salvarProcessoJudicial(formData: FormData) {
  const sessao = await exigirSessao();
  exigirPermissao(sessao, "processos.criar");
  const supabase = await criarClienteServidor();

  const campos: Record<string, string> = {
    tipo: "judicial",
    pasta: txt(formData, "pasta"),
    numero: txt(formData, "numero"),
    tribunal_codigo: txt(formData, "tribunal_codigo"),
    vara: txt(formData, "vara"),
    comarca: txt(formData, "comarca"),
    instancia: txt(formData, "instancia"),
    tipo_acao: txt(formData, "tipo_acao"),
    fase: txt(formData, "fase"),
    polo: txt(formData, "polo"),
    valor_causa: txt(formData, "valor_causa"),
    data_distribuicao: txt(formData, "data_distribuicao"),
    publicacao: txt(formData, "publicacao"),
    retorno: txt(formData, "retorno"),
  };

  function voltar(erro: string): never {
    const p = new URLSearchParams(campos);
    p.set("erro", erro);
    redirect(`/processos/novo?${p.toString()}`);
  }

  if (!campos.pasta) voltar("Escolha a pasta.");
  if (!campos.numero) voltar("Informe o número do processo.");

  // O número pode ser um CNJ (guarda os componentes) ou não (REsp, RE, número
  // antigo). O tribunal vem sempre do seletor — que já vem preenchido pelo CNJ.
  const analise = analisarCnj(campos.numero);
  const cnj = analise.ok ? analise.cnj : null;

  const codigo = Number(campos.tribunal_codigo);
  if (!Number.isInteger(codigo) || codigo < 100) {
    voltar("Escolha o tribunal.");
  }
  const tribunalId = await garantirTribunalPorCodigo(
    supabase,
    sessao.escritorioId,
    codigo,
  );

  let processoId: string;
  try {
    processoId = await criarProcessoJudicial(supabase, {
      escritorioId: sessao.escritorioId,
      pastaId: campos.pasta,
      poloCliente: polo(campos.polo),
      numero: cnj ? cnj.formatado : campos.numero,
      cnjFormatado: cnj?.formatado ?? null,
      cnjPartes: cnj?.partes ?? null,
      digitoConfere: cnj?.digitoConfere ?? null,
      justica: cnj?.justica ?? null,
      tribunalId,
      vara: campos.vara || null,
      comarca: campos.comarca || null,
      instancia: campos.instancia || null,
      tipoAcao: campos.tipo_acao || null,
      fase: campos.fase || null,
      valorCausa: numOuNull(campos.valor_causa),
      dataDistribuicao: campos.data_distribuicao || null,
    });
  } catch (e) {
    voltar(e instanceof Error ? e.message : "Falha ao salvar o processo.");
  }

  // Veio da triagem de uma publicação do DJEN (Etapa 5): já vincula.
  if (campos.publicacao) {
    await vincularProcessoNaPublicacao(supabase, campos.publicacao, processoId);
  }

  // Encadeamento de cadastros → volta pro passo anterior com o processo pronto.
  const retorno = lerRetorno(campos.retorno);
  if (retorno) {
    redirect(anexarId(retorno, "processo", processoId));
  }
  if (campos.publicacao) {
    redirect(`/publicacoes/${campos.publicacao}`);
  }

  redirect("/processos?criado=1");
}

export async function salvarProcessoAdministrativo(formData: FormData) {
  const sessao = await exigirSessao();
  exigirPermissao(sessao, "processos.criar");
  const supabase = await criarClienteServidor();

  const pasta = txt(formData, "pasta");
  const retorno = lerRetorno(txt(formData, "retorno"));
  const esferaRaw = txt(formData, "esfera");
  const esfera =
    esferaRaw === "federal" || esferaRaw === "estadual" || esferaRaw === "municipal"
      ? esferaRaw
      : null;

  function voltar(erro: string): never {
    const p = new URLSearchParams({ tipo: "administrativo", erro });
    if (retorno) p.set("retorno", retorno);
    redirect(`/processos/novo?${p.toString()}`);
  }

  if (!pasta) {
    voltar("Escolha a pasta.");
  }

  let processoId: string;
  try {
    processoId = await criarProcessoAdministrativo(supabase, {
      escritorioId: sessao.escritorioId,
      pastaId: pasta,
      poloCliente: polo(txt(formData, "polo")),
      numeroAdm: txt(formData, "numero_adm") || null,
      orgaoJulgador: txt(formData, "orgao_julgador") || null,
      esfera,
      assunto: txt(formData, "assunto") || null,
      fase: txt(formData, "fase") || null,
      dataProtocolo: txt(formData, "data_protocolo") || null,
    });
  } catch (e) {
    voltar(e instanceof Error ? e.message : "Falha ao salvar.");
  }

  if (retorno) {
    redirect(anexarId(retorno, "processo", processoId));
  }
  redirect("/processos?criado=1");
}
