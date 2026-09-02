// Acesso a dados: `processo` (base) + detalhes `processo_judicial` /
// `processo_administrativo` (§3.5). O `geral` continua sendo criado por trigger
// junto com a pasta; aqui tratamos os processos judiciais/administrativos.

import type { SupabaseClient } from "@supabase/supabase-js";

// Todos os processos do escritório, para os seletores "onde cadastrar a
// atividade" (agrupados por pasta na tela). Toda atividade vai num processo.
export type ProcessoParaSelecao = {
  id: string;
  tipo: "geral" | "judicial" | "administrativo";
  numero: string | null;
  pastaId: string;
  pastaCodigo: string;
  pastaNome: string | null;
  clienteNome: string | null;
};

export async function listarProcessosParaSelecao(
  supabase: SupabaseClient,
  escritorioId: string,
): Promise<ProcessoParaSelecao[]> {
  const { data, error } = await supabase
    .from("processo")
    .select(
      `id, tipo, numero, pasta_id,
       pasta:pasta_id ( codigo, nome, ano, sequencial,
                        pasta_cliente ( cliente:cliente_id ( nome ) ) )`,
    )
    .eq("escritorio_id", escritorioId)
    .is("deletado_em", null);

  if (error) {
    throw new Error(`Falha ao listar processos: ${error.message}`);
  }

  const ordemTipo = { geral: 0, judicial: 1, administrativo: 2 };

  const itens = (data ?? []).map((linha) => {
    const pasta = um<{
      codigo: string;
      nome: string | null;
      ano: number;
      sequencial: number;
      pasta_cliente: unknown;
    }>(linha.pasta);
    const cliente = um<{ nome: string }>(
      um<{ cliente: unknown }>(arr(pasta?.pasta_cliente)[0])?.cliente,
    );
    const tipo = linha.tipo as ProcessoParaSelecao["tipo"];
    return {
      processo: {
        id: linha.id as string,
        tipo,
        numero: (linha.numero as string | null) ?? null,
        pastaId: linha.pasta_id as string,
        pastaCodigo: pasta?.codigo ?? "—",
        pastaNome: pasta?.nome ?? null,
        clienteNome: cliente?.nome ?? null,
      } satisfies ProcessoParaSelecao,
      // chave de ordenação: pasta mais nova primeiro; geral antes dos outros
      ordem:
        -(pasta?.ano ?? 0) * 1e9 -
        (pasta?.sequencial ?? 0) * 10 +
        ordemTipo[tipo],
    };
  });

  itens.sort((a, b) => a.ordem - b.ordem);
  return itens.map((x) => x.processo);
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

// ── Buscar um processo para edição (base + detalhe) ───────────────────────
export type ProcessoEdicao = {
  id: string;
  tipo: "geral" | "judicial" | "administrativo";
  pastaId: string;
  pastaCodigo: string;
  pastaNome: string | null;
  clienteNome: string | null;
  numero: string | null;
  status: string;
  poloCliente: "autor" | "reu" | "terceiro" | null;
  observacoes: string | null;
  judicial: {
    cnj: string | null;
    justica: string | null;
    tribunalId: string | null;
    vara: string | null;
    comarca: string | null;
    instancia: string | null;
    tipoAcao: string | null;
    juizo: string | null;
    fase: string | null;
    valorCausa: number | null;
    dataDistribuicao: string | null;
    digitoConfere: boolean | null;
  } | null;
  administrativo: {
    numeroAdm: string | null;
    orgaoJulgador: string | null;
    secretaria: string | null;
    esfera: "federal" | "estadual" | "municipal" | null;
    tipo: string | null;
    assunto: string | null;
    autoridadeCompetente: string | null;
    protocolo: string | null;
    dataProtocolo: string | null;
    fase: string | null;
  } | null;
};

export async function buscarProcesso(
  supabase: SupabaseClient,
  escritorioId: string,
  id: string,
): Promise<ProcessoEdicao | null> {
  const { data, error } = await supabase
    .from("processo")
    .select(
      `id, tipo, numero, status, polo_cliente, observacoes, pasta_id,
       pasta:pasta_id ( codigo, nome, pasta_cliente ( cliente:cliente_id ( nome ) ) ),
       processo_judicial ( cnj, justica, tribunal_id, vara, comarca, instancia,
                           tipo_acao, juizo, fase, valor_causa, data_distribuicao,
                           cnj_digito_confere ),
       processo_administrativo ( numero_adm, orgao_julgador, secretaria, esfera,
                                 tipo, assunto, autoridade_competente, protocolo,
                                 data_protocolo, fase )`,
    )
    .eq("escritorio_id", escritorioId)
    .eq("id", id)
    .is("deletado_em", null)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao carregar o processo: ${error.message}`);
  }
  if (!data) return null;

  const pasta = um<{ codigo: string; nome: string | null; pasta_cliente: unknown }>(
    data.pasta,
  );
  const cliente = um<{ nome: string }>(
    um<{ cliente: unknown }>(arr(pasta?.pasta_cliente)[0])?.cliente,
  );
  const j = um<Record<string, unknown>>(data.processo_judicial);
  const a = um<Record<string, unknown>>(data.processo_administrativo);

  return {
    id: data.id as string,
    tipo: data.tipo as ProcessoEdicao["tipo"],
    pastaId: data.pasta_id as string,
    pastaCodigo: pasta?.codigo ?? "—",
    pastaNome: pasta?.nome ?? null,
    clienteNome: cliente?.nome ?? null,
    numero: (data.numero as string | null) ?? null,
    status: data.status as string,
    poloCliente: (data.polo_cliente as ProcessoEdicao["poloCliente"]) ?? null,
    observacoes: (data.observacoes as string | null) ?? null,
    judicial: j
      ? {
          cnj: (j.cnj as string | null) ?? null,
          justica: (j.justica as string | null) ?? null,
          tribunalId: (j.tribunal_id as string | null) ?? null,
          vara: (j.vara as string | null) ?? null,
          comarca: (j.comarca as string | null) ?? null,
          instancia: (j.instancia as string | null) ?? null,
          tipoAcao: (j.tipo_acao as string | null) ?? null,
          juizo: (j.juizo as string | null) ?? null,
          fase: (j.fase as string | null) ?? null,
          valorCausa: (j.valor_causa as number | null) ?? null,
          dataDistribuicao: (j.data_distribuicao as string | null) ?? null,
          digitoConfere: (j.cnj_digito_confere as boolean | null) ?? null,
        }
      : null,
    administrativo: a
      ? {
          numeroAdm: (a.numero_adm as string | null) ?? null,
          orgaoJulgador: (a.orgao_julgador as string | null) ?? null,
          secretaria: (a.secretaria as string | null) ?? null,
          esfera:
            (a.esfera as "federal" | "estadual" | "municipal" | null) ?? null,
          tipo: (a.tipo as string | null) ?? null,
          assunto: (a.assunto as string | null) ?? null,
          autoridadeCompetente:
            (a.autoridade_competente as string | null) ?? null,
          protocolo: (a.protocolo as string | null) ?? null,
          dataProtocolo: (a.data_protocolo as string | null) ?? null,
          fase: (a.fase as string | null) ?? null,
        }
      : null,
  };
}

// ── Atualizar processo judicial (base + detalhe) ──────────────────────────
export type EdicaoProcessoJudicial = {
  poloCliente: "autor" | "reu" | "terceiro" | null;
  status: string;
  observacoes: string | null;
  // CNJ já analisado (null = mantém o que está)
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
  instancia: string | null;
  tipoAcao: string | null;
  juizo: string | null;
  fase: string | null;
  valorCausa: number | null;
  dataDistribuicao: string | null;
};

export async function atualizarProcessoJudicial(
  supabase: SupabaseClient,
  id: string,
  c: EdicaoProcessoJudicial,
): Promise<void> {
  const base = await supabase
    .from("processo")
    .update({
      numero: c.cnjFormatado,
      polo_cliente: c.poloCliente,
      status: c.status,
      observacoes: c.observacoes,
      data_inicio: c.dataDistribuicao,
    })
    .eq("id", id);
  if (base.error) {
    throw new Error(`Falha ao atualizar o processo: ${base.error.message}`);
  }

  const detalhe = await supabase
    .from("processo_judicial")
    .update({
      cnj: c.cnjFormatado,
      cnj_sequencial: c.cnjPartes?.sequencial ?? null,
      cnj_dv: c.cnjPartes?.digitoVerificador ?? null,
      cnj_ano: c.cnjPartes?.ano ?? null,
      cnj_segmento: c.cnjPartes?.segmento ?? null,
      cnj_tribunal: c.cnjPartes?.tribunal ?? null,
      cnj_origem: c.cnjPartes?.origem ?? null,
      cnj_digito_confere: c.digitoConfere,
      justica: c.justica,
      tribunal_id: c.tribunalId,
      vara: c.vara,
      comarca: c.comarca,
      instancia: c.instancia,
      tipo_acao: c.tipoAcao,
      juizo: c.juizo,
      fase: c.fase,
      valor_causa: c.valorCausa,
      data_distribuicao: c.dataDistribuicao,
    })
    .eq("processo_id", id);
  if (detalhe.error) {
    throw new Error(
      `Falha ao atualizar o detalhe judicial: ${detalhe.error.message}`,
    );
  }
}

// ── Atualizar processo administrativo (base + detalhe) ────────────────────
export type EdicaoProcessoAdministrativo = {
  poloCliente: "autor" | "reu" | "terceiro" | null;
  status: string;
  observacoes: string | null;
  numeroAdm: string | null;
  orgaoJulgador: string | null;
  secretaria: string | null;
  esfera: "federal" | "estadual" | "municipal" | null;
  tipo: string | null;
  assunto: string | null;
  autoridadeCompetente: string | null;
  protocolo: string | null;
  dataProtocolo: string | null;
  fase: string | null;
};

export async function atualizarProcessoAdministrativo(
  supabase: SupabaseClient,
  id: string,
  c: EdicaoProcessoAdministrativo,
): Promise<void> {
  const base = await supabase
    .from("processo")
    .update({
      numero: c.numeroAdm,
      polo_cliente: c.poloCliente,
      status: c.status,
      observacoes: c.observacoes,
      data_inicio: c.dataProtocolo,
    })
    .eq("id", id);
  if (base.error) {
    throw new Error(`Falha ao atualizar o processo: ${base.error.message}`);
  }

  const detalhe = await supabase
    .from("processo_administrativo")
    .update({
      numero_adm: c.numeroAdm,
      orgao_julgador: c.orgaoJulgador,
      secretaria: c.secretaria,
      esfera: c.esfera,
      tipo: c.tipo,
      assunto: c.assunto,
      autoridade_competente: c.autoridadeCompetente,
      protocolo: c.protocolo,
      data_protocolo: c.dataProtocolo,
      fase: c.fase,
    })
    .eq("processo_id", id);
  if (detalhe.error) {
    throw new Error(
      `Falha ao atualizar o detalhe administrativo: ${detalhe.error.message}`,
    );
  }
}

// Soft-delete (plano §0). As atividades e publicações ligadas continuam no
// banco mas somem das listas.
export async function excluirProcesso(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const agora = new Date().toISOString();
  const { error } = await supabase
    .from("processo")
    .update({ deletado_em: agora })
    .eq("id", id);
  if (error) {
    throw new Error(`Falha ao excluir o processo: ${error.message}`);
  }
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
  instancia: string | null;
  tipoAcao: string | null;
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
    instancia: p.instancia,
    tipo_acao: p.tipoAcao,
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
