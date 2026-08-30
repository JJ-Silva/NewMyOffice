"use server";

import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { exigirSessao } from "@/lib/supabase/sessao";
import { analisarCnj } from "@/lib/domain/cnj";
import {
  criarProcessoJudicial,
  criarProcessoAdministrativo,
} from "@/lib/db/processos";
import { vincularProcessoNaPublicacao } from "@/lib/db/publicacoes";

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
  const supabase = await criarClienteServidor();

  const campos: Record<string, string> = {
    tipo: "judicial",
    pasta: txt(formData, "pasta"),
    cnj: txt(formData, "cnj"),
    tribunal: txt(formData, "tribunal"),
    vara: txt(formData, "vara"),
    comarca: txt(formData, "comarca"),
    fase: txt(formData, "fase"),
    polo: txt(formData, "polo"),
    valor_causa: txt(formData, "valor_causa"),
    data_distribuicao: txt(formData, "data_distribuicao"),
    publicacao: txt(formData, "publicacao"),
  };

  function voltar(erro: string): never {
    const p = new URLSearchParams(campos);
    p.set("erro", erro);
    redirect(`/processos/novo?${p.toString()}`);
  }

  if (!campos.pasta) voltar("Escolha a pasta.");
  const analise = analisarCnj(campos.cnj);
  if (!analise.ok) voltar(analise.erro);

  let processoId: string;
  try {
    processoId = await criarProcessoJudicial(supabase, {
      escritorioId: sessao.escritorioId,
      pastaId: campos.pasta,
      poloCliente: polo(campos.polo),
      cnjFormatado: analise.cnj.formatado,
      cnjPartes: analise.cnj.partes,
      digitoConfere: analise.cnj.digitoConfere,
      justica: analise.cnj.justica,
      tribunalId: campos.tribunal || null,
      vara: campos.vara || null,
      comarca: campos.comarca || null,
      fase: campos.fase || null,
      valorCausa: numOuNull(campos.valor_causa),
      dataDistribuicao: campos.data_distribuicao || null,
    });
  } catch (e) {
    voltar(e instanceof Error ? e.message : "Falha ao salvar o processo.");
  }

  // Veio da triagem de uma publicação do DJEN (Etapa 5): vincula e volta.
  if (campos.publicacao) {
    await vincularProcessoNaPublicacao(supabase, campos.publicacao, processoId);
    redirect(`/publicacoes/${campos.publicacao}`);
  }

  redirect("/processos?criado=1");
}

export async function salvarProcessoAdministrativo(formData: FormData) {
  const sessao = await exigirSessao();
  const supabase = await criarClienteServidor();

  const pasta = txt(formData, "pasta");
  const esferaRaw = txt(formData, "esfera");
  const esfera =
    esferaRaw === "federal" || esferaRaw === "estadual" || esferaRaw === "municipal"
      ? esferaRaw
      : null;

  if (!pasta) {
    redirect(
      "/processos/novo?tipo=administrativo&erro=" +
        encodeURIComponent("Escolha a pasta."),
    );
  }

  try {
    await criarProcessoAdministrativo(supabase, {
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
    redirect(
      "/processos/novo?tipo=administrativo&erro=" +
        encodeURIComponent(
          e instanceof Error ? e.message : "Falha ao salvar.",
        ),
    );
  }

  redirect("/processos?criado=1");
}
