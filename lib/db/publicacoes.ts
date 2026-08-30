// Acesso a dados: `publicacao` — as comunicações trazidas do DJEN e sua triagem.
//
// Fluxo: `salvarComunicacoes` grava o que veio da API (dedupe pelo id do DJEN)
// e já tenta casar cada uma com um `processo_judicial` pelo nº CNJ. Depois o
// advogado tria: descarta (informativa) ou vira prazo (Passo D).

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ComunicacaoDjen } from "@/lib/djen/comunica-api";
import { trecho, pareceSemPrazo } from "@/lib/domain/publicacao";

// Na UI "descartada" aparece como "arquivada" — o valor gravado continua
// 'descartada' (constraint da migration); só o rótulo muda.
export type StatusPublicacao = "nova" | "descartada" | "virou_prazo";

export type PublicacaoLista = {
  id: string;
  djenId: number;
  dataDisponibilizacao: string;
  siglaTribunal: string | null;
  nomeOrgao: string | null;
  tipoComunicacao: string | null;
  nomeClasse: string | null;
  cnj: string | null;
  resumo: string;
  texto: string;
  status: StatusPublicacao;
  motivoDescarte: string | null;
  semPrazoProvavel: boolean;
  // vínculo
  processoId: string | null;
  processoNumero: string | null;
  pastaId: string | null;
  pastaCodigo: string | null;
  pastaNome: string | null;
  clienteNome: string | null;
  atividadeId: string | null;
};

export type PublicacaoDetalhe = PublicacaoLista & {
  textoOriginal: string | null;
  hash: string | null;
  link: string | null;
  numeroProcesso: string | null;
};

// Grava as comunicações novas. Dedupe por (escritorio_id, djen_id). Casa o CNJ
// com um processo_judicial já cadastrado, quando existir.
export async function salvarComunicacoes(
  supabase: SupabaseClient,
  escritorioId: string,
  comunicacoes: ComunicacaoDjen[],
): Promise<{ novas: number; jaExistiam: number }> {
  if (comunicacoes.length === 0) return { novas: 0, jaExistiam: 0 };

  const djenIds = comunicacoes.map((c) => c.djenId);
  const { data: existentes, error: erroExist } = await supabase
    .from("publicacao")
    .select("djen_id")
    .eq("escritorio_id", escritorioId)
    .in("djen_id", djenIds);
  if (erroExist) {
    throw new Error(`Falha ao checar publicações existentes: ${erroExist.message}`);
  }
  const jaTem = new Set((existentes ?? []).map((r) => r.djen_id as number));
  const novas = comunicacoes.filter((c) => !jaTem.has(c.djenId));
  if (novas.length === 0) {
    return { novas: 0, jaExistiam: comunicacoes.length };
  }

  // Auto-match: CNJ → processo_judicial do escritório.
  const cnjs = [...new Set(novas.map((c) => c.cnj).filter((x): x is string => !!x))];
  const porCnj = new Map<string, string>();
  if (cnjs.length > 0) {
    const { data: processos, error: erroProc } = await supabase
      .from("processo_judicial")
      .select("processo_id, cnj")
      .eq("escritorio_id", escritorioId)
      .in("cnj", cnjs)
      .is("deletado_em", null);
    if (erroProc) {
      throw new Error(`Falha ao casar CNJ com processos: ${erroProc.message}`);
    }
    for (const p of processos ?? []) {
      porCnj.set(p.cnj as string, p.processo_id as string);
    }
  }

  const linhas = novas.map((c) => ({
    escritorio_id: escritorioId,
    djen_id: c.djenId,
    hash: c.hash,
    data_disponibilizacao: c.dataDisponibilizacao,
    sigla_tribunal: c.siglaTribunal,
    nome_orgao: c.nomeOrgao,
    tipo_comunicacao: c.tipoComunicacao,
    nome_classe: c.nomeClasse,
    numero_processo: c.numeroProcesso,
    cnj: c.cnj,
    texto: c.texto,
    texto_original: c.textoOriginal,
    link: c.link,
    meio: c.meio,
    processo_id: c.cnj ? (porCnj.get(c.cnj) ?? null) : null,
  }));

  const { error } = await supabase.from("publicacao").insert(linhas);
  if (error) {
    // corrida com outra busca simultânea → alguns já entraram
    if (error.code === "23505") {
      return { novas: 0, jaExistiam: comunicacoes.length };
    }
    throw new Error(`Falha ao gravar as publicações: ${error.message}`);
  }

  return { novas: novas.length, jaExistiam: comunicacoes.length - novas.length };
}

const SELECT_LISTA = `
  id, djen_id, data_disponibilizacao, sigla_tribunal, nome_orgao,
  tipo_comunicacao, nome_classe, cnj, texto, status, motivo_descarte,
  atividade_id, processo_id,
  processo:processo_id (
    tipo, numero, pasta_id,
    pasta:pasta_id ( codigo, nome, pasta_cliente ( cliente:cliente_id ( nome ) ) )
  )`;

const SELECT_DETALHE = `
  id, djen_id, data_disponibilizacao, sigla_tribunal, nome_orgao,
  tipo_comunicacao, nome_classe, cnj, texto, status, atividade_id, processo_id,
  texto_original, hash, link, numero_processo, motivo_descarte,
  processo:processo_id (
    tipo, numero, pasta_id,
    pasta:pasta_id ( codigo, nome, pasta_cliente ( cliente:cliente_id ( nome ) ) )
  )`;

export async function listarPublicacoes(
  supabase: SupabaseClient,
  escritorioId: string,
  filtro: { status?: StatusPublicacao } = {},
): Promise<PublicacaoLista[]> {
  let q = supabase
    .from("publicacao")
    .select(SELECT_LISTA)
    .eq("escritorio_id", escritorioId)
    .is("deletado_em", null)
    .order("data_disponibilizacao", { ascending: false });

  if (filtro.status) q = q.eq("status", filtro.status);

  const { data, error } = await q;
  if (error) {
    throw new Error(`Falha ao listar publicações: ${error.message}`);
  }
  return (data ?? []).map(mapearLista);
}

export async function buscarPublicacao(
  supabase: SupabaseClient,
  escritorioId: string,
  id: string,
): Promise<PublicacaoDetalhe | null> {
  const { data, error } = await supabase
    .from("publicacao")
    .select(SELECT_DETALHE)
    .eq("escritorio_id", escritorioId)
    .eq("id", id)
    .is("deletado_em", null)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao carregar a publicação: ${error.message}`);
  }
  if (!data) return null;

  return {
    ...mapearLista(data),
    textoOriginal: (data.texto_original as string | null) ?? null,
    hash: (data.hash as string | null) ?? null,
    link: (data.link as string | null) ?? null,
    numeroProcesso: (data.numero_processo as string | null) ?? null,
  };
}

export async function contarPublicacoesNovas(
  supabase: SupabaseClient,
  escritorioId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("publicacao")
    .select("id", { count: "exact", head: true })
    .eq("escritorio_id", escritorioId)
    .eq("status", "nova")
    .is("deletado_em", null);
  if (error) {
    throw new Error(`Falha ao contar publicações novas: ${error.message}`);
  }
  return count ?? 0;
}

// Arquivar = tirar da fila de triagem (não vira prazo). Guarda a justificativa.
// O valor gravado em `status` é 'descartada' (constraint da migration).
export async function arquivarPublicacao(
  supabase: SupabaseClient,
  args: { id: string; membroId: string; motivo: string | null },
): Promise<void> {
  const { error } = await supabase
    .from("publicacao")
    .update({
      status: "descartada",
      motivo_descarte: args.motivo,
      triado_por: args.membroId,
      triado_em: new Date().toISOString(),
    })
    .eq("id", args.id);
  if (error) throw new Error(`Falha ao arquivar: ${error.message}`);
}

export async function reabrirPublicacao(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("publicacao")
    .update({ status: "nova", motivo_descarte: null, triado_em: null })
    .eq("id", id)
    .neq("status", "virou_prazo"); // não desfaz um prazo já criado
  if (error) throw new Error(`Falha ao reabrir: ${error.message}`);
}

export async function vincularProcessoNaPublicacao(
  supabase: SupabaseClient,
  id: string,
  processoId: string,
): Promise<void> {
  const { error } = await supabase
    .from("publicacao")
    .update({ processo_id: processoId })
    .eq("id", id);
  if (error) throw new Error(`Falha ao vincular o processo: ${error.message}`);
}

export async function marcarPublicacaoVirouPrazo(
  supabase: SupabaseClient,
  args: {
    id: string;
    membroId: string;
    atividadeId: string;
    processoId: string;
  },
): Promise<void> {
  const { error } = await supabase
    .from("publicacao")
    .update({
      status: "virou_prazo",
      atividade_id: args.atividadeId,
      processo_id: args.processoId,
      triado_por: args.membroId,
      triado_em: new Date().toISOString(),
    })
    .eq("id", args.id);
  if (error) throw new Error(`Falha ao marcar a publicação: ${error.message}`);
}

// ── interno ────────────────────────────────────────────────────────────────
function mapearLista(linha: Record<string, unknown>): PublicacaoLista {
  const processo = um<{
    tipo: string;
    numero: string | null;
    pasta_id: string;
    pasta: unknown;
  }>(linha.processo);
  const pasta = um<{
    codigo: string;
    nome: string | null;
    pasta_cliente: unknown;
  }>(processo?.pasta);
  const cliente = um<{ nome: string }>(
    um<{ cliente: unknown }>(arr(pasta?.pasta_cliente)[0])?.cliente,
  );
  const texto = (linha.texto as string) ?? "";

  return {
    id: linha.id as string,
    djenId: linha.djen_id as number,
    dataDisponibilizacao: linha.data_disponibilizacao as string,
    siglaTribunal: (linha.sigla_tribunal as string | null) ?? null,
    nomeOrgao: (linha.nome_orgao as string | null) ?? null,
    tipoComunicacao: (linha.tipo_comunicacao as string | null) ?? null,
    nomeClasse: (linha.nome_classe as string | null) ?? null,
    cnj: (linha.cnj as string | null) ?? null,
    resumo: trecho(texto),
    texto,
    status: linha.status as StatusPublicacao,
    motivoDescarte: (linha.motivo_descarte as string | null) ?? null,
    semPrazoProvavel: pareceSemPrazo(texto),
    processoId: (linha.processo_id as string | null) ?? null,
    processoNumero: processo?.numero ?? null,
    pastaId: processo?.pasta_id ?? null,
    pastaCodigo: pasta?.codigo ?? null,
    pastaNome: pasta?.nome ?? null,
    clienteNome: cliente?.nome ?? null,
    atividadeId: (linha.atividade_id as string | null) ?? null,
  };
}

function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : v ? [v] : [];
}
function um<T>(v: unknown): T | null {
  if (Array.isArray(v)) return (v[0] as T) ?? null;
  return (v as T) ?? null;
}
