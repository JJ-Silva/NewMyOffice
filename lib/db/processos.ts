// Acesso a dados: `processo` (base) + detalhes `processo_judicial` /
// `processo_administrativo` (§3.5). O `geral` continua sendo criado por trigger
// junto com a pasta; aqui tratamos os processos judiciais/administrativos.

import type { SupabaseClient } from "@supabase/supabase-js";

export type ProcessoResumo = {
  id: string;
  tipo: "geral" | "judicial" | "administrativo";
  numero: string | null;
};

export async function listarProcessosDaPasta(
  supabase: SupabaseClient,
  pastaId: string,
): Promise<ProcessoResumo[]> {
  const { data, error } = await supabase
    .from("processo")
    .select("id, tipo, numero")
    .eq("pasta_id", pastaId)
    .is("deletado_em", null)
    .order("tipo", { ascending: true });

  if (error) {
    throw new Error(`Falha ao listar processos da pasta: ${error.message}`);
  }
  return (data ?? []) as ProcessoResumo[];
}

// ── Lista geral de processos (judicial + administrativo) ───────────────────
export type ProcessoLista = {
  id: string;
  tipo: "judicial" | "administrativo";
  numero: string | null;
  poloCliente: "autor" | "reu" | "terceiro" | null;
  status: string;
  pastaId: string;
  pastaCodigo: string;
  pastaNome: string | null;
  clienteNome: string | null;
  // judicial
  fase: string | null;
  vara: string | null;
  comarca: string | null;
  justica: string | null;
  tribunalSigla: string | null;
  valorCausa: number | null;
  dataDistribuicao: string | null;
  digitoConfere: boolean | null;
  // administrativo
  orgaoJulgador: string | null;
  esfera: string | null;
};

export async function listarProcessos(
  supabase: SupabaseClient,
  escritorioId: string,
  filtros: { pastaId?: string } = {},
): Promise<ProcessoLista[]> {
  const { data, error } = await supabase
    .from("processo")
    .select(
      `id, tipo, numero, polo_cliente, status, pasta_id,
       pasta:pasta_id ( codigo, nome, pasta_cliente ( cliente:cliente_id ( nome ) ) ),
       processo_judicial ( fase, vara, comarca, justica, valor_causa, data_distribuicao,
                           cnj_digito_confere, tribunal:tribunal_id ( sigla ) ),
       processo_administrativo ( orgao_julgador, esfera, fase )`,
    )
    .eq("escritorio_id", escritorioId)
    .neq("tipo", "geral")
    .is("deletado_em", null)
    .order("criado_em", { ascending: false });

  if (error) {
    throw new Error(`Falha ao listar processos: ${error.message}`);
  }

  let itens = (data ?? []).map((linha): ProcessoLista => {
    const pasta = um<{
      codigo: string;
      nome: string | null;
      pasta_cliente: unknown;
    }>(linha.pasta);
    const cliente = um<{ nome: string }>(
      um<{ cliente: unknown }>(arr(pasta?.pasta_cliente)[0])?.cliente,
    );
    const jud = um<Record<string, unknown>>(linha.processo_judicial);
    const adm = um<Record<string, unknown>>(linha.processo_administrativo);
    return {
      id: linha.id as string,
      tipo: linha.tipo as "judicial" | "administrativo",
      numero: (linha.numero as string | null) ?? null,
      poloCliente: (linha.polo_cliente as ProcessoLista["poloCliente"]) ?? null,
      status: linha.status as string,
      pastaId: linha.pasta_id as string,
      pastaCodigo: pasta?.codigo ?? "—",
      pastaNome: pasta?.nome ?? null,
      clienteNome: cliente?.nome ?? null,
      fase:
        (jud?.fase as string | null) ?? (adm?.fase as string | null) ?? null,
      vara: (jud?.vara as string | null) ?? null,
      comarca: (jud?.comarca as string | null) ?? null,
      justica: (jud?.justica as string | null) ?? null,
      tribunalSigla:
        um<{ sigla: string }>(jud?.tribunal)?.sigla ?? null,
      valorCausa: (jud?.valor_causa as number | null) ?? null,
      dataDistribuicao: (jud?.data_distribuicao as string | null) ?? null,
      digitoConfere: (jud?.cnj_digito_confere as boolean | null) ?? null,
      orgaoJulgador: (adm?.orgao_julgador as string | null) ?? null,
      esfera: (adm?.esfera as string | null) ?? null,
    };
  });

  if (filtros.pastaId) {
    itens = itens.filter((i) => i.pastaId === filtros.pastaId);
  }
  return itens;
}

// ── Criar processo judicial ───────────────────────────────────────────────
export type NovoProcessoJudicial = {
  escritorioId: string;
  pastaId: string;
  poloCliente: "autor" | "reu" | "terceiro" | null;
  // CNJ (já analisado)
  cnjFormatado: string | null;
  cnjPartes: {
    sequencial: number;
    digitoVerificador: number;
    ano: number;
    segmento: number;
    tribunal: number;
    origem: number;
  } | null;
  digitoConfere: boolean | null;
  justica: string | null;
  tribunalId: string | null;
  vara: string | null;
  comarca: string | null;
  fase: string | null;
  valorCausa: number | null;
  dataDistribuicao: string | null;
};

export async function criarProcessoJudicial(
  supabase: SupabaseClient,
  p: NovoProcessoJudicial,
): Promise<string> {
  const base = await supabase
    .from("processo")
    .insert({
      escritorio_id: p.escritorioId,
      pasta_id: p.pastaId,
      tipo: "judicial",
      numero: p.cnjFormatado,
      polo_cliente: p.poloCliente,
      data_inicio: p.dataDistribuicao,
    })
    .select("id")
    .single();
  if (base.error) {
    throw new Error(`Falha ao criar o processo: ${base.error.message}`);
  }
  const processoId = base.data.id as string;

  const detalhe = await supabase.from("processo_judicial").insert({
    processo_id: processoId,
    escritorio_id: p.escritorioId,
    cnj: p.cnjFormatado,
    cnj_sequencial: p.cnjPartes?.sequencial ?? null,
    cnj_dv: p.cnjPartes?.digitoVerificador ?? null,
    cnj_ano: p.cnjPartes?.ano ?? null,
    cnj_segmento: p.cnjPartes?.segmento ?? null,
    cnj_tribunal: p.cnjPartes?.tribunal ?? null,
    cnj_origem: p.cnjPartes?.origem ?? null,
    cnj_digito_confere: p.digitoConfere,
    justica: p.justica,
    tribunal_id: p.tribunalId,
    vara: p.vara,
    comarca: p.comarca,
    fase: p.fase,
    valor_causa: p.valorCausa,
    data_distribuicao: p.dataDistribuicao,
  });
  if (detalhe.error) {
    throw new Error(
      `Processo criado, mas falhou o detalhe judicial: ${detalhe.error.message}`,
    );
  }
  return processoId;
}

// ── Criar processo administrativo ─────────────────────────────────────────
export type NovoProcessoAdministrativo = {
  escritorioId: string;
  pastaId: string;
  poloCliente: "autor" | "reu" | "terceiro" | null;
  numeroAdm: string | null;
  orgaoJulgador: string | null;
  esfera: "federal" | "estadual" | "municipal" | null;
  assunto: string | null;
  fase: string | null;
  dataProtocolo: string | null;
};

export async function criarProcessoAdministrativo(
  supabase: SupabaseClient,
  p: NovoProcessoAdministrativo,
): Promise<string> {
  const base = await supabase
    .from("processo")
    .insert({
      escritorio_id: p.escritorioId,
      pasta_id: p.pastaId,
      tipo: "administrativo",
      numero: p.numeroAdm,
      polo_cliente: p.poloCliente,
      data_inicio: p.dataProtocolo,
    })
    .select("id")
    .single();
  if (base.error) {
    throw new Error(`Falha ao criar o processo: ${base.error.message}`);
  }
  const processoId = base.data.id as string;

  const detalhe = await supabase.from("processo_administrativo").insert({
    processo_id: processoId,
    escritorio_id: p.escritorioId,
    numero_adm: p.numeroAdm,
    orgao_julgador: p.orgaoJulgador,
    esfera: p.esfera,
    assunto: p.assunto,
    fase: p.fase,
    data_protocolo: p.dataProtocolo,
  });
  if (detalhe.error) {
    throw new Error(
      `Processo criado, mas falhou o detalhe administrativo: ${detalhe.error.message}`,
    );
  }
  return processoId;
}

// ── normalização do retorno do PostgREST ───────────────────────────────────
function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : v ? [v] : [];
}
function um<T>(v: unknown): T | null {
  if (Array.isArray(v)) return (v[0] as T) ?? null;
  return (v as T) ?? null;
}
