// Acesso a dados: `processo` (base) + detalhes `processo_judicial` /
// `processo_administrativo` (§3.5). O `geral` continua sendo criado por trigger
// junto com a pasta; aqui tratamos os processos judiciais/administrativos.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { NumeroJudicial } from "@/lib/domain/numero-processo";

// Uma linha do seletor de processo (modal de busca — components/BuscaSeletor).
// Toda atividade vai num processo; o 'geral' representa o trabalho da pasta sem
// processo formal (e na busca aparece como a própria pasta — ver
// lib/domain/rotulo-processo.ts).
export type ProcessoParaSelecao = {
  id: string;
  tipo: "geral" | "judicial" | "administrativo";
  numero: string | null;
  pastaId: string | null; // null = processo sem pasta
  pastaCodigo: string | null;
  pastaNome: string | null;
  clienteNome: string | null;
};

// `select` compartilhado por todas as leituras que devolvem ProcessoParaSelecao.
const SELECT_SELECAO = `id, tipo, numero, pasta_id,
   pasta:pasta_id ( codigo, nome,
                    pasta_cliente ( cliente:cliente_id ( nome ) ) )`;

type LinhaSelecao = {
  id: unknown;
  tipo: unknown;
  numero: unknown;
  pasta_id: unknown;
  pasta: unknown;
};

function mapSelecao(linha: LinhaSelecao): ProcessoParaSelecao {
  const pasta = um<{
    codigo: string;
    nome: string | null;
    pasta_cliente: unknown;
  }>(linha.pasta);
  const cliente = um<{ nome: string }>(
    um<{ cliente: unknown }>(arr(pasta?.pasta_cliente)[0])?.cliente,
  );
  return {
    id: linha.id as string,
    tipo: linha.tipo as ProcessoParaSelecao["tipo"],
    numero: (linha.numero as string | null) ?? null,
    pastaId: (linha.pasta_id as string | null) ?? null,
    pastaCodigo: pasta?.codigo ?? null,
    pastaNome: pasta?.nome ?? null,
    clienteNome: cliente?.nome ?? null,
  };
}

// Um processo pelo id — para o rótulo inicial do seletor quando a tela já
// recebe ?processo_id= (vindo da agenda, de uma publicação, etc.).
export async function buscarProcessoParaSelecao(
  supabase: SupabaseClient,
  escritorioId: string,
  id: string,
): Promise<ProcessoParaSelecao | null> {
  const { data, error } = await supabase
    .from("processo")
    .select(SELECT_SELECAO)
    .eq("escritorio_id", escritorioId)
    .eq("id", id)
    .is("deletado_em", null)
    .maybeSingle();
  if (error) {
    throw new Error(`Falha ao carregar o processo: ${error.message}`);
  }
  return data ? mapSelecao(data as LinhaSelecao) : null;
}

// O processo 'geral' de uma pasta (a tela recebe ?pasta= e quer pré-selecionar
// o trabalho de nível-pasta). Há no máximo um por pasta (índice parcial).
export async function buscarProcessoGeralDaPasta(
  supabase: SupabaseClient,
  escritorioId: string,
  pastaId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("processo")
    .select("id")
    .eq("escritorio_id", escritorioId)
    .eq("pasta_id", pastaId)
    .eq("tipo", "geral")
    .is("deletado_em", null)
    .maybeSingle();
  if (error) {
    throw new Error(`Falha ao achar o processo geral: ${error.message}`);
  }
  return (data?.id as string | undefined) ?? null;
}

// Guard "sem nenhum processo → manda cadastrar um" sem carregar a lista toda.
export async function existeAlgumProcesso(
  supabase: SupabaseClient,
  escritorioId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("processo")
    .select("id")
    .eq("escritorio_id", escritorioId)
    .is("deletado_em", null)
    .limit(1);
  if (error) {
    throw new Error(`Falha ao verificar processos: ${error.message}`);
  }
  return (data?.length ?? 0) > 0;
}

// ── Busca de processo (modal do seletor) ──────────────────────────────────
//
// Uma caixa de texto, que casa contra: número do processo · código/nome da
// pasta · nome do cliente · nome da parte ou do advogado adverso. Cada campo é
// uma query própria e visível (nada de query builder dinâmico); os ids são
// unidos no TypeScript e uma última query hidrata a página.
//
// A RLS de cada tabela continua valendo (o client é o de sessão): quem não tem
// `clientes.ver` não acha por nome de cliente, etc. — igual ao seletor antigo.

export type BuscaProcessos = {
  itens: ProcessoParaSelecao[];
  temMais: boolean;
  // algum filtro bateu no teto → a lista pode estar incompleta ("refine a busca")
  truncado: boolean;
};

const TETO_POR_CAMPO = 200; // ids que cada campo contribui, no máximo
const TETO_UNIAO = 200; // ids que vão para a query final (limite de URL)

export async function buscarProcessosParaSelecao(
  supabase: SupabaseClient,
  escritorioId: string,
  opcoes: { q: string; offset?: number; limite?: number },
): Promise<BuscaProcessos> {
  const offset = Math.max(0, opcoes.offset ?? 0);
  const limite = Math.min(50, Math.max(1, opcoes.limite ?? 30));
  // vírgula e parênteses quebram a sintaxe do .or() do PostgREST
  const termo = opcoes.q.replace(/[,()]/g, " ").trim();

  // Sem texto: lista tudo, mais recentes primeiro, paginado (scroll infinito).
  if (!termo) {
    const { data, error } = await supabase
      .from("processo")
      .select(SELECT_SELECAO)
      .eq("escritorio_id", escritorioId)
      .is("deletado_em", null)
      .order("criado_em", { ascending: false })
      .range(offset, offset + limite); // pega limite+1 p/ saber se há mais
    if (error) {
      throw new Error(`Falha ao listar processos: ${error.message}`);
    }
    const linhas = (data ?? []) as LinhaSelecao[];
    return {
      itens: linhas.slice(0, limite).map(mapSelecao),
      temMais: linhas.length > limite,
      truncado: false,
    };
  }

  const like = `%${termo}%`;
  const digitos = termo.replace(/[^0-9a-zA-Z]/g, "");
  const likeDigitos = digitos && digitos !== termo ? `%${digitos}%` : null;

  const ids = new Set<string>();
  let truncado = false;
  const absorver = (
    linhas: Array<{ id?: unknown; processo_id?: unknown }> | null,
  ) => {
    for (const l of linhas ?? []) {
      const id = (l.id ?? l.processo_id) as string | undefined;
      if (id) ids.add(id);
    }
    if ((linhas?.length ?? 0) >= TETO_POR_CAMPO) truncado = true;
  };

  // 1 · número do processo (como digitado e só os dígitos/letras)
  {
    const filtro = likeDigitos
      ? `numero.ilike.${like},numero.ilike.${likeDigitos}`
      : `numero.ilike.${like}`;
    const { data, error } = await supabase
      .from("processo")
      .select("id")
      .eq("escritorio_id", escritorioId)
      .is("deletado_em", null)
      .or(filtro)
      .limit(TETO_POR_CAMPO);
    if (error) throw new Error(`Falha na busca por número: ${error.message}`);
    absorver(data);
  }

  // 2 · pasta (código AAAA/NNNNNN ou nome) → processos dessa pasta
  {
    const { data: pastas, error } = await supabase
      .from("pasta")
      .select("id")
      .eq("escritorio_id", escritorioId)
      .is("deletado_em", null)
      .or(`codigo.ilike.${like},nome.ilike.${like}`)
      .limit(TETO_POR_CAMPO);
    if (error) throw new Error(`Falha na busca por pasta: ${error.message}`);
    const pastaIds = (pastas ?? []).map((p) => p.id as string);
    if (pastaIds.length) {
      const { data, error: e2 } = await supabase
        .from("processo")
        .select("id")
        .eq("escritorio_id", escritorioId)
        .is("deletado_em", null)
        .in("pasta_id", pastaIds)
        .limit(TETO_POR_CAMPO);
      if (e2) throw new Error(`Falha na busca por pasta: ${e2.message}`);
      absorver(data);
    }
  }

  // 3 · cliente (nome) → pastas do cliente → processos
  {
    const { data: clientes, error } = await supabase
      .from("cliente")
      .select("id")
      .eq("escritorio_id", escritorioId)
      .is("deletado_em", null)
      .ilike("nome", like)
      .limit(TETO_POR_CAMPO);
    if (error) throw new Error(`Falha na busca por cliente: ${error.message}`);
    const clienteIds = (clientes ?? []).map((c) => c.id as string);
    if (clienteIds.length) {
      const { data: vinculos, error: e2 } = await supabase
        .from("pasta_cliente")
        .select("pasta_id")
        .in("cliente_id", clienteIds)
        .limit(TETO_POR_CAMPO);
      if (e2) throw new Error(`Falha na busca por cliente: ${e2.message}`);
      const pastaIds = [
        ...new Set((vinculos ?? []).map((v) => v.pasta_id as string)),
      ];
      if (pastaIds.length) {
        const { data, error: e3 } = await supabase
          .from("processo")
          .select("id")
          .eq("escritorio_id", escritorioId)
          .is("deletado_em", null)
          .in("pasta_id", pastaIds)
          .limit(TETO_POR_CAMPO);
        if (e3) throw new Error(`Falha na busca por cliente: ${e3.message}`);
        absorver(data);
      }
    }
  }

  // 4 · parte / advogado adverso (nome) → processo_id
  {
    const { data, error } = await supabase
      .from("parte")
      .select("processo_id")
      .eq("escritorio_id", escritorioId)
      .is("deletado_em", null)
      .or(`nome.ilike.${like},advogado_adverso.ilike.${like}`)
      .limit(TETO_POR_CAMPO);
    if (error) throw new Error(`Falha na busca por parte: ${error.message}`);
    absorver(data);
  }

  const universo = [...ids];
  if (universo.length > TETO_UNIAO) truncado = true;
  const pagina = universo.slice(0, TETO_UNIAO);
  if (pagina.length === 0) {
    return { itens: [], temMais: false, truncado };
  }

  const { data, error } = await supabase
    .from("processo")
    .select(SELECT_SELECAO)
    .in("id", pagina)
    .order("criado_em", { ascending: false })
    .range(offset, offset + limite - 1);
  if (error) {
    throw new Error(`Falha ao carregar os processos: ${error.message}`);
  }

  return {
    itens: ((data ?? []) as LinhaSelecao[]).map(mapSelecao),
    temMais: offset + limite < pagina.length,
    truncado,
  };
}

// ── Lista geral de processos (judicial + administrativo) ───────────────────
export type ProcessoLista = {
  id: string;
  tipo: "judicial" | "administrativo";
  numero: string | null;
  poloCliente: "autor" | "reu" | "terceiro" | null;
  status: string;
  pastaId: string | null; // null = processo sem pasta
  pastaCodigo: string | null;
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
      pastaId: (linha.pasta_id as string | null) ?? null,
      pastaCodigo: pasta?.codigo ?? null,
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
  pastaId: string | null; // null = processo sem pasta
  pastaCodigo: string | null;
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
    tribunalCodigoCnj: number | null; // pré-seleciona o seletor manual
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
                           cnj_digito_confere,
                           tribunal:tribunal_id ( codigo_cnj ) ),
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
    pastaId: (data.pasta_id as string | null) ?? null,
    pastaCodigo: pasta?.codigo ?? null,
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
          tribunalCodigoCnj:
            (um<{ codigo_cnj: number | null }>(j.tribunal)?.codigo_cnj as
              | number
              | null) ?? null,
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
  // número já interpretado (lib/domain/numero-processo.ts)
  numero: NumeroJudicial;
  // `tribunal` do escritório, resolvido a partir de `numero.tribunalCodigo`
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

// NumeroJudicial → colunas `cnj_*` / `justica` de `processo_judicial`.
// Um lugar só (antes o mapa vivia repetido em criar e atualizar).
function colunasDoNumero(n: NumeroJudicial) {
  return {
    cnj: n.cnjFormatado,
    cnj_sequencial: n.cnjPartes?.sequencial ?? null,
    cnj_dv: n.cnjPartes?.digitoVerificador ?? null,
    cnj_ano: n.cnjPartes?.ano ?? null,
    cnj_segmento: n.cnjPartes?.segmento ?? null,
    cnj_tribunal: n.cnjPartes?.tribunal ?? null,
    cnj_origem: n.cnjPartes?.origem ?? null,
    cnj_digito_confere: n.digitoConfere,
    justica: n.justica,
  };
}

export async function atualizarProcessoJudicial(
  supabase: SupabaseClient,
  id: string,
  c: EdicaoProcessoJudicial,
): Promise<void> {
  const base = await supabase
    .from("processo")
    .update({
      numero: c.numero.numero,
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
      ...colunasDoNumero(c.numero),
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

// Vincula (ou desvincula, com pastaId null) um processo a uma pasta — o
// "organizo depois" do cadastro sem pasta. Como toda atividade aponta pro
// processo (não pra pasta), isto é um único UPDATE: nada mais se move.
export async function vincularPastaAoProcesso(
  supabase: SupabaseClient,
  processoId: string,
  pastaId: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("processo")
    .update({ pasta_id: pastaId })
    .eq("id", processoId)
    .neq("tipo", "geral"); // o 'geral' é a própria pasta — nunca troca
  if (error) {
    throw new Error(`Falha ao vincular a pasta: ${error.message}`);
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
  pastaId: string | null; // null = processo sem pasta (vincula depois)
  poloCliente: "autor" | "reu" | "terceiro" | null;
  // número já interpretado (lib/domain/numero-processo.ts)
  numero: NumeroJudicial;
  // `tribunal` do escritório, resolvido a partir de `numero.tribunalCodigo`
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
      numero: p.numero.numero,
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
    ...colunasDoNumero(p.numero),
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
  pastaId: string | null; // null = processo sem pasta (vincula depois)
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
