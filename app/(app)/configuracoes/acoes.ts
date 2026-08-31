"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { criarConvite, cancelarConvite } from "@/lib/db/convites";
import {
  exigirSessao,
  podeAbrirConfiguracoes,
  exigirPermissao,
} from "@/lib/supabase/sessao";
import { ehPermissao, type Permissao } from "@/lib/domain/permissoes";
import {
  criarRotulo,
  atualizarRotulo,
  excluirRotulo,
} from "@/lib/db/rotulos";
import {
  trocarRotuloDoMembro,
  definirAtivoDoMembro,
  definirOverrideDoMembro,
  removerOverrideDoMembro,
} from "@/lib/db/membros";
import {
  criarTribunal,
  excluirTribunal,
} from "@/lib/db/tribunais";
import { criarFeriado, excluirFeriado } from "@/lib/db/feriados";
import {
  criarPeriodoNaoUtil,
  excluirPeriodoNaoUtil,
} from "@/lib/db/periodos-nao-uteis";
import { adicionarOab, excluirOab } from "@/lib/db/oab";
import {
  criarTipoDeAtividade,
  atualizarTipoDeAtividade,
  excluirTipoDeAtividade,
  type CamposTipoAtividade,
} from "@/lib/db/tipos-atividade";

// Cada ação de Configurações exige a permissão da sua área:
//   tribunais / feriados / recesso → config.tribunais
//   OABs monitoradas               → oab.gerenciar
//   tipos de atividade             → config.catalogos
async function contextoAutorizado(permissao: Permissao) {
  const sessao = await exigirSessao();
  if (!podeAbrirConfiguracoes(sessao)) {
    redirect("/agenda");
  }
  exigirPermissao(sessao, permissao);
  const supabase = await criarClienteServidor();
  return { sessao, supabase };
}

function texto(formData: FormData, campo: string): string {
  return String(formData.get(campo) ?? "").trim();
}

// ── Tribunais ───────────────────────────────────────────────────────────────
export async function adicionarTribunal(formData: FormData) {
  const { sessao, supabase } = await contextoAutorizado("config.tribunais");
  const nome = texto(formData, "nome");
  const sigla = texto(formData, "sigla");
  if (!nome || !sigla) {
    return;
  }
  await criarTribunal(supabase, {
    escritorioId: sessao.escritorioId,
    nome,
    sigla,
  });
  revalidatePath("/configuracoes");
}

export async function removerTribunal(formData: FormData) {
  const { supabase } = await contextoAutorizado("config.tribunais");
  const id = texto(formData, "id");
  if (id) {
    await excluirTribunal(supabase, id);
    revalidatePath("/configuracoes");
  }
}

// ── Feriados ────────────────────────────────────────────────────────────────
export async function adicionarFeriado(formData: FormData) {
  const { sessao, supabase } = await contextoAutorizado("config.tribunais");
  const data = texto(formData, "data");
  const descricao = texto(formData, "descricao");
  const tribunalIds = formData.getAll("tribunal_ids").map(String);
  if (!data || !descricao) {
    return;
  }
  await criarFeriado(supabase, {
    escritorioId: sessao.escritorioId,
    data,
    descricao,
    repeteTodoAno: formData.get("repete_todo_ano") === "on",
    tribunalIds,
  });
  revalidatePath("/configuracoes");
}

export async function removerFeriado(formData: FormData) {
  const { supabase } = await contextoAutorizado("config.tribunais");
  const id = texto(formData, "id");
  if (id) {
    await excluirFeriado(supabase, id);
    revalidatePath("/configuracoes");
  }
}

// ── Períodos não úteis (recesso) ────────────────────────────────────────────
export async function adicionarPeriodoNaoUtil(formData: FormData) {
  const { sessao, supabase } = await contextoAutorizado("config.tribunais");
  const dataInicio = texto(formData, "data_inicio");
  const dataFim = texto(formData, "data_fim");
  const descricao = texto(formData, "descricao");
  const tribunalIds = formData.getAll("tribunal_ids").map(String);
  if (!dataInicio || !dataFim || !descricao) {
    return;
  }
  await criarPeriodoNaoUtil(supabase, {
    escritorioId: sessao.escritorioId,
    dataInicio,
    dataFim,
    descricao,
    repeteTodoAno: formData.get("repete_todo_ano") === "on",
    tribunalIds,
  });
  revalidatePath("/configuracoes");
}

export async function removerPeriodoNaoUtil(formData: FormData) {
  const { supabase } = await contextoAutorizado("config.tribunais");
  const id = texto(formData, "id");
  if (id) {
    await excluirPeriodoNaoUtil(supabase, id);
    revalidatePath("/configuracoes");
  }
}

// ── OABs monitoradas (DJEN) ────────────────────────────────────────────────
export async function adicionarOabAction(formData: FormData) {
  const { sessao, supabase } = await contextoAutorizado("oab.gerenciar");
  const numero = texto(formData, "numero");
  const uf = texto(formData, "uf");
  if (!numero || !uf) return;
  try {
    await adicionarOab(supabase, {
      escritorioId: sessao.escritorioId,
      numero,
      uf,
      nomeAdvogado: texto(formData, "nome_advogado") || null,
    });
  } catch (e) {
    redirect(
      "/configuracoes?erro=" +
        encodeURIComponent(
          e instanceof Error ? e.message : "Falha ao adicionar a OAB.",
        ),
    );
  }
  revalidatePath("/configuracoes");
}

export async function removerOabAction(formData: FormData) {
  const { supabase } = await contextoAutorizado("oab.gerenciar");
  const id = texto(formData, "id");
  if (id) {
    await excluirOab(supabase, id);
    revalidatePath("/configuracoes");
  }
}

// ── Catálogo: tipos de atividade (prazo / compromisso / monitoramento) ──────
function lerCamposTipo(formData: FormData): CamposTipoAtividade {
  const aplicaARaw = texto(formData, "aplica_a");
  const aplicaA =
    aplicaARaw === "compromisso" || aplicaARaw === "monitoramento"
      ? aplicaARaw
      : "prazo";
  const naturezaRaw = texto(formData, "natureza");
  const dias = parseInt(texto(formData, "dias_padrao"), 10);
  return {
    nome: texto(formData, "nome"),
    aplicaA,
    diasPadrao: Number.isFinite(dias) && dias > 0 ? dias : null,
    natureza:
      naturezaRaw === "processual" ||
      naturezaRaw === "material" ||
      naturezaRaw === "interna"
        ? naturezaRaw
        : null,
    exigePeca: formData.get("exige_peca") === "1",
    categoria: texto(formData, "categoria") || null,
  };
}

export async function adicionarTipoAtividadeAction(formData: FormData) {
  const { sessao, supabase } = await contextoAutorizado("config.catalogos");
  const campos = lerCamposTipo(formData);
  if (!campos.nome) return;
  try {
    await criarTipoDeAtividade(supabase, sessao.escritorioId, campos);
  } catch (e) {
    redirect(
      "/configuracoes?erro=" +
        encodeURIComponent(e instanceof Error ? e.message : "Falha ao criar."),
    );
  }
  revalidatePath("/configuracoes");
  revalidatePath("/", "layout"); // o nome do tipo aparece na agenda, no lançamento, etc.
}

export async function editarTipoAtividadeAction(formData: FormData) {
  const { supabase } = await contextoAutorizado("config.catalogos");
  const id = texto(formData, "id");
  const campos = lerCamposTipo(formData);
  if (!id || !campos.nome) return;
  try {
    await atualizarTipoDeAtividade(supabase, id, campos);
  } catch (e) {
    redirect(
      "/configuracoes?erro=" +
        encodeURIComponent(
          e instanceof Error ? e.message : "Falha ao atualizar.",
        ),
    );
  }
  revalidatePath("/configuracoes");
  revalidatePath("/", "layout"); // o nome do tipo aparece na agenda, no lançamento, etc.
}

export async function removerTipoAtividadeAction(formData: FormData) {
  const { supabase } = await contextoAutorizado("config.catalogos");
  const id = texto(formData, "id");
  if (id) {
    await excluirTipoDeAtividade(supabase, id);
    revalidatePath("/configuracoes");
  revalidatePath("/", "layout"); // o nome do tipo aparece na agenda, no lançamento, etc.
  }
}

// ── Rótulos (funções) e permissões ─────────────────────────────────────────
// Permissão trocada em rótulo/membro muda o que aparece em toda a app →
// revalida o layout inteiro.
function recarregarPermissoes() {
  revalidatePath("/configuracoes");
  revalidatePath("/", "layout");
}

function lerPermissoes(formData: FormData): Permissao[] {
  return formData
    .getAll("permissoes")
    .map(String)
    .filter(ehPermissao);
}

function erroConfig(mensagem: string): never {
  redirect("/configuracoes?erro=" + encodeURIComponent(mensagem));
}

export async function criarRotuloAction(formData: FormData) {
  const { sessao, supabase } = await contextoAutorizado("rotulos.gerenciar");
  try {
    await criarRotulo(supabase, sessao.escritorioId, {
      nome: texto(formData, "nome"),
      descricao: texto(formData, "descricao") || null,
      permissoes: lerPermissoes(formData),
    });
  } catch (e) {
    erroConfig(e instanceof Error ? e.message : "Falha ao criar o rótulo.");
  }
  recarregarPermissoes();
}

export async function editarRotuloAction(formData: FormData) {
  const { supabase } = await contextoAutorizado("rotulos.gerenciar");
  const id = texto(formData, "id");
  if (!id) return;
  try {
    await atualizarRotulo(supabase, id, {
      nome: texto(formData, "nome"),
      descricao: texto(formData, "descricao") || null,
      permissoes: lerPermissoes(formData),
    });
  } catch (e) {
    erroConfig(e instanceof Error ? e.message : "Falha ao salvar o rótulo.");
  }
  recarregarPermissoes();
}

export async function excluirRotuloAction(formData: FormData) {
  const { supabase } = await contextoAutorizado("rotulos.gerenciar");
  const id = texto(formData, "id");
  if (!id) return;
  try {
    await excluirRotulo(supabase, id);
  } catch (e) {
    erroConfig(e instanceof Error ? e.message : "Falha ao excluir o rótulo.");
  }
  recarregarPermissoes();
}

// ── Equipe (membros) ──────────────────────────────────────────────────────
// O fundador nunca é desativado nem perde acesso; ninguém se desativa.
async function garantirAlvoValido(
  supabase: Awaited<ReturnType<typeof criarClienteServidor>>,
  membroId: string,
  escritorioId: string,
): Promise<{ fundador: boolean }> {
  const { data } = await supabase
    .from("membro")
    .select("fundador")
    .eq("id", membroId)
    .eq("escritorio_id", escritorioId)
    .is("deletado_em", null)
    .maybeSingle();
  if (!data) {
    erroConfig("Membro não encontrado neste escritório.");
  }
  return { fundador: Boolean(data.fundador) };
}

export async function trocarRotuloMembroAction(formData: FormData) {
  const { sessao, supabase } = await contextoAutorizado("membros.gerenciar");
  const membroId = texto(formData, "membro_id");
  const rotuloId = texto(formData, "rotulo_id") || null;
  if (!membroId) return;
  await garantirAlvoValido(supabase, membroId, sessao.escritorioId);
  try {
    await trocarRotuloDoMembro(supabase, membroId, rotuloId);
  } catch (e) {
    erroConfig(e instanceof Error ? e.message : "Falha ao trocar o rótulo.");
  }
  recarregarPermissoes();
}

export async function alternarAtivoMembroAction(formData: FormData) {
  const { sessao, supabase } = await contextoAutorizado("membros.gerenciar");
  const membroId = texto(formData, "membro_id");
  const ativo = texto(formData, "ativo") === "1";
  if (!membroId) return;

  if (membroId === sessao.membro.id) {
    erroConfig("Você não pode desativar o seu próprio acesso.");
  }
  const alvo = await garantirAlvoValido(supabase, membroId, sessao.escritorioId);
  if (alvo.fundador && !ativo) {
    erroConfig("O sócio fundador não pode ser desativado.");
  }

  try {
    await definirAtivoDoMembro(supabase, membroId, ativo);
  } catch (e) {
    erroConfig(e instanceof Error ? e.message : "Falha ao alterar o membro.");
  }
  recarregarPermissoes();
}

// ── Convites ──────────────────────────────────────────────────────────────
// Gera o convite; o admin copia o link e manda para a pessoa (e-mail, WhatsApp).
// O envio automático de e-mail entra junto com a Etapa 3b (Resend).
export async function convidarMembroAction(formData: FormData) {
  const { sessao, supabase } = await contextoAutorizado("membros.gerenciar");
  const email = texto(formData, "email");
  const rotuloId = texto(formData, "rotulo_id") || null;

  try {
    await criarConvite(supabase, {
      escritorioId: sessao.escritorioId,
      email,
      rotuloId,
      criadoPor: sessao.membro.id,
    });
  } catch (e) {
    erroConfig(e instanceof Error ? e.message : "Falha ao criar o convite.");
  }

  recarregarPermissoes();
}

export async function cancelarConviteAction(formData: FormData) {
  const { supabase } = await contextoAutorizado("membros.gerenciar");
  const id = texto(formData, "id");
  if (!id) return;
  try {
    await cancelarConvite(supabase, id);
  } catch (e) {
    erroConfig(e instanceof Error ? e.message : "Falha ao cancelar o convite.");
  }
  recarregarPermissoes();
}

export async function definirOverrideMembroAction(formData: FormData) {
  const { sessao, supabase } = await contextoAutorizado("membros.gerenciar");
  const membroId = texto(formData, "membro_id");
  const permissaoRaw = texto(formData, "permissao");
  const valor = texto(formData, "valor"); // "concede" | "nega" | "herda"
  if (!membroId || !ehPermissao(permissaoRaw)) return;
  await garantirAlvoValido(supabase, membroId, sessao.escritorioId);

  try {
    if (valor === "herda") {
      await removerOverrideDoMembro(supabase, membroId, permissaoRaw);
    } else {
      await definirOverrideDoMembro(
        supabase,
        membroId,
        permissaoRaw,
        valor === "concede",
      );
    }
  } catch (e) {
    erroConfig(e instanceof Error ? e.message : "Falha ao gravar a exceção.");
  }
  recarregarPermissoes();
}
