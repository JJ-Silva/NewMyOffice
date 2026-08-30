// Acesso a dados: `atividade_recorrencia` (Etapa 3a).
//
// A régua guarda o TEMPLATE (o que copiar em cada instância) + a REGRA. O motor
// puro (lib/domain/recorrencia.ts) diz QUAIS datas. Aqui a gente materializa:
// cria as linhas `atividade` (+ detalhe) que ainda faltam, dentro de um
// horizonte de 90 dias, e também "a próxima" quando uma instância é concluída.
//
// Só compromisso e monitoramento recorrem (plano §3.6 — prazo nunca).

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  HORIZONTE_MATERIALIZACAO_DIAS,
  descreverRegra,
  ocorrenciasAte,
  ocorrenciasFaltantes,
  primeiraOcorrencia,
  proximaOcorrenciaApos,
  type Periodicidade,
  type RegraRecorrencia,
  type Termino,
} from "@/lib/domain/recorrencia";
import { somarDias, maiorData, compararDatas } from "@/lib/domain/datas";

type AtividadeTipoRecorrente = "compromisso" | "monitoramento";
type Prioridade = "baixa" | "media" | "alta" | "urgente";

export type NovaRecorrencia = {
  escritorioId: string;
  atividadeTipo: AtividadeTipoRecorrente;
  processoId: string;
  tipoAtividadeId: string;
  titulo: string;
  descricao: string | null;
  responsavelId: string | null;
  prioridadeManual: Prioridade;
  diasAntesVisivelCustom: number | null;
  // detalhe — só o par do atividadeTipo é usado
  hora: string | null;
  local: string | null;
  duracaoEstimadaMin: number | null;
  alvo: string | null;
  // regra
  regra: RegraRecorrencia;
};

// ── Criar ────────────────────────────────────────────────────────────────────
export async function criarRecorrencia(
  supabase: SupabaseClient,
  nova: NovaRecorrencia,
  hoje: string,
): Promise<{ id: string; instanciasCriadas: number }> {
  const { data, error } = await supabase
    .from("atividade_recorrencia")
    .insert({
      escritorio_id: nova.escritorioId,
      atividade_tipo: nova.atividadeTipo,
      processo_id: nova.processoId,
      tipo_atividade_id: nova.tipoAtividadeId,
      titulo: nova.titulo,
      descricao: nova.descricao,
      responsavel_id: nova.responsavelId,
      prioridade_manual: nova.prioridadeManual,
      dias_antes_visivel_custom: nova.diasAntesVisivelCustom,
      hora: nova.atividadeTipo === "compromisso" ? nova.hora : null,
      local: nova.atividadeTipo === "compromisso" ? nova.local : null,
      duracao_estimada_min:
        nova.atividadeTipo === "compromisso" ? nova.duracaoEstimadaMin : null,
      alvo: nova.atividadeTipo === "monitoramento" ? nova.alvo : null,
      ...colunasDaRegra(nova.regra),
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Falha ao criar a recorrência: ${error.message}`);
  }

  const id = data.id as string;
  const instanciasCriadas = await materializarRecorrencia(
    supabase,
    nova.escritorioId,
    id,
    hoje,
  );
  return { id, instanciasCriadas };
}

// ── Materializar (janela rolante) ────────────────────────────────────────────
// Cria as instâncias que faltam até `hoje + 90 dias`. `garantirProximaApos`
// estica o limite para incluir a próxima ocorrência depois daquela data —
// usado ao concluir uma instância (recorrências espaçadas, ex.: "a cada
// 6 meses", cairiam fora do horizonte de outro jeito).
export async function materializarRecorrencia(
  supabase: SupabaseClient,
  escritorioId: string,
  recorrenciaId: string,
  hoje: string,
  opcoes: { garantirProximaApos?: string } = {},
): Promise<number> {
  const { data: linha, error } = await supabase
    .from("atividade_recorrencia")
    .select("*")
    .eq("id", recorrenciaId)
    .eq("escritorio_id", escritorioId)
    .eq("ativa", true)
    .is("deletado_em", null)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao carregar a recorrência: ${error.message}`);
  }
  if (!linha) return 0;

  const regra = regraDaLinha(linha);

  // Datas que já existem para esta série — INCLUI as apagadas (uma ocorrência
  // que o usuário removeu não deve voltar na próxima materialização).
  const { data: existentesRaw, error: erroExistentes } = await supabase
    .from("atividade")
    .select("data")
    .eq("recorrencia_id", recorrenciaId);
  if (erroExistentes) {
    throw new Error(
      `Falha ao ler as instâncias da recorrência: ${erroExistentes.message}`,
    );
  }
  const jaExistentes = (existentesRaw ?? []).map((r) => r.data as string);

  let limite = somarDias(hoje, HORIZONTE_MATERIALIZACAO_DIAS);
  const primeira = primeiraOcorrencia(regra);
  if (primeira) limite = maiorData(limite, primeira);
  if (opcoes.garantirProximaApos) {
    const prox = proximaOcorrenciaApos(regra, opcoes.garantirProximaApos);
    if (prox) limite = maiorData(limite, prox);
  }

  const faltantes = ocorrenciasFaltantes(regra, jaExistentes, limite);

  let criadas = 0;
  for (const data of faltantes) {
    if (await criarInstancia(supabase, linha, data)) criadas++;
  }

  await encerrarSeSerieCompletaNoPassado(supabase, linha, regra, [
    ...jaExistentes,
    ...faltantes,
  ], hoje);

  return criadas;
}

// Roda para todas as recorrências ativas do escritório. Chamada ao abrir a
// agenda (é a "janela rolante"). Caso comum: nada a fazer, só leituras.
export async function materializarRecorrenciasDoEscritorio(
  supabase: SupabaseClient,
  escritorioId: string,
  hoje: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("atividade_recorrencia")
    .select("id")
    .eq("escritorio_id", escritorioId)
    .eq("ativa", true)
    .is("deletado_em", null);
  if (error) {
    throw new Error(`Falha ao listar recorrências ativas: ${error.message}`);
  }

  let total = 0;
  for (const r of data ?? []) {
    total += await materializarRecorrencia(
      supabase,
      escritorioId,
      r.id as string,
      hoje,
    );
  }
  return total;
}

// Ao concluir/verificar uma instância: garante que a próxima já exista.
export async function gerarProximaInstancia(
  supabase: SupabaseClient,
  escritorioId: string,
  atividadeId: string,
  hoje: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("atividade")
    .select("recorrencia_id, data")
    .eq("id", atividadeId)
    .maybeSingle();
  if (error || !data?.recorrencia_id) return;

  await materializarRecorrencia(
    supabase,
    escritorioId,
    data.recorrencia_id as string,
    hoje,
    { garantirProximaApos: data.data as string },
  );
}

// ── Listar (tela /recorrencias) ─────────────────────────────────────────────
export type RecorrenciaResumo = {
  id: string;
  atividadeTipo: AtividadeTipoRecorrente;
  titulo: string;
  tipoAtividadeNome: string | null;
  pastaId: string;
  pastaCodigo: string;
  pastaNome: string | null;
  clienteNome: string | null;
  responsavelNome: string | null;
  descricaoRegra: string;
  proximaData: string | null;
  ativa: boolean;
  qtdInstancias: number;
  qtdPendentes: number;
};

export async function listarRecorrencias(
  supabase: SupabaseClient,
  escritorioId: string,
  hoje: string,
): Promise<RecorrenciaResumo[]> {
  const { data, error } = await supabase
    .from("atividade_recorrencia")
    .select(
      `id, atividade_tipo, titulo, ativa,
       data_base, periodicidade_tipo, intervalo_cada, intervalo_unidade,
       dias_da_semana, dia_do_mes, termino_tipo, termino_ate, termino_ocorrencias,
       tipo_atividade:tipo_atividade_id ( nome ),
       responsavel:responsavel_id ( usuario:usuario_id ( nome ) ),
       processo:processo_id (
         pasta_id,
         pasta:pasta_id ( codigo, nome, pasta_cliente ( cliente:cliente_id ( nome ) ) )
       )`,
    )
    .eq("escritorio_id", escritorioId)
    .is("deletado_em", null)
    .order("ativa", { ascending: false })
    .order("criado_em", { ascending: false });

  if (error) {
    throw new Error(`Falha ao listar recorrências: ${error.message}`);
  }

  const linhas = data ?? [];
  const ids = linhas.map((l) => l.id as string);

  // Contagem de instâncias (uma query só, agregada no código).
  const contagem = new Map<string, { total: number; pendentes: number }>();
  if (ids.length > 0) {
    const { data: instancias, error: erroInst } = await supabase
      .from("atividade")
      .select("recorrencia_id, status")
      .in("recorrencia_id", ids)
      .is("deletado_em", null);
    if (erroInst) {
      throw new Error(
        `Falha ao contar instâncias das recorrências: ${erroInst.message}`,
      );
    }
    for (const i of instancias ?? []) {
      const rid = i.recorrencia_id as string;
      const c = contagem.get(rid) ?? { total: 0, pendentes: 0 };
      c.total++;
      if (i.status === "pendente" || i.status === "em_andamento") c.pendentes++;
      contagem.set(rid, c);
    }
  }

  return linhas.map((l): RecorrenciaResumo => {
    const regra = regraDaLinha(l);
    const processo = um<{ pasta_id: string; pasta: unknown }>(l.processo);
    const pasta = um<{
      codigo: string;
      nome: string | null;
      pasta_cliente: unknown;
    }>(processo?.pasta);
    const cliente = um<{ nome: string }>(
      um<{ cliente: unknown }>(arr(pasta?.pasta_cliente)[0])?.cliente,
    );
    const resp = um<{ usuario: unknown }>(l.responsavel);
    const c = contagem.get(l.id as string) ?? { total: 0, pendentes: 0 };

    return {
      id: l.id as string,
      atividadeTipo: l.atividade_tipo as AtividadeTipoRecorrente,
      titulo: l.titulo as string,
      tipoAtividadeNome: um<{ nome: string }>(l.tipo_atividade)?.nome ?? null,
      pastaId: processo?.pasta_id ?? "",
      pastaCodigo: pasta?.codigo ?? "—",
      pastaNome: pasta?.nome ?? null,
      clienteNome: cliente?.nome ?? null,
      responsavelNome: um<{ nome: string }>(resp?.usuario)?.nome ?? null,
      descricaoRegra: descreverRegra(regra),
      // "próxima" = primeira ocorrência de hoje em diante
      proximaData: (l.ativa as boolean)
        ? proximaOcorrenciaApos(regra, somarDias(hoje, -1))
        : null,
      ativa: l.ativa as boolean,
      qtdInstancias: c.total,
      qtdPendentes: c.pendentes,
    };
  });
}

// ── Encerrar / excluir ─────────────────────────────────────────────────────
// Encerrar: a série para de gerar novas instâncias. As futuras ainda pendentes
// são removidas (soft-delete) — o que já passou ou foi concluído fica.
export async function encerrarRecorrencia(
  supabase: SupabaseClient,
  escritorioId: string,
  id: string,
  hoje: string,
): Promise<void> {
  const upd = await supabase
    .from("atividade_recorrencia")
    .update({ ativa: false })
    .eq("id", id)
    .eq("escritorio_id", escritorioId);
  if (upd.error) {
    throw new Error(`Falha ao encerrar a recorrência: ${upd.error.message}`);
  }
  await removerFuturasPendentes(supabase, id, hoje, "gt");
}

// Excluir: régua criada errada. Soft-delete da régua + das instâncias pendentes
// de hoje em diante.
export async function excluirRecorrencia(
  supabase: SupabaseClient,
  escritorioId: string,
  id: string,
  hoje: string,
): Promise<void> {
  const agora = new Date().toISOString();
  const upd = await supabase
    .from("atividade_recorrencia")
    .update({ ativa: false, deletado_em: agora })
    .eq("id", id)
    .eq("escritorio_id", escritorioId);
  if (upd.error) {
    throw new Error(`Falha ao excluir a recorrência: ${upd.error.message}`);
  }
  await removerFuturasPendentes(supabase, id, hoje, "gte");
}

async function removerFuturasPendentes(
  supabase: SupabaseClient,
  recorrenciaId: string,
  hoje: string,
  corte: "gt" | "gte",
): Promise<void> {
  const agora = new Date().toISOString();
  let q = supabase
    .from("atividade")
    .update({ deletado_em: agora })
    .eq("recorrencia_id", recorrenciaId)
    .eq("status", "pendente")
    .is("deletado_em", null);
  q = corte === "gt" ? q.gt("data", hoje) : q.gte("data", hoje);
  const { error } = await q;
  if (error) {
    throw new Error(
      `Recorrência encerrada, mas falhou ao limpar as instâncias futuras: ${error.message}`,
    );
  }
}

// ── Interno ────────────────────────────────────────────────────────────────
async function criarInstancia(
  supabase: SupabaseClient,
  linha: Record<string, unknown>,
  data: string,
): Promise<boolean> {
  const base = await supabase
    .from("atividade")
    .insert({
      escritorio_id: linha.escritorio_id,
      processo_id: linha.processo_id,
      tipo: linha.atividade_tipo,
      tipo_atividade_id: linha.tipo_atividade_id,
      titulo: linha.titulo,
      descricao: linha.descricao,
      data,
      responsavel_id: linha.responsavel_id,
      prioridade_manual: linha.prioridade_manual,
      status: "pendente",
      dias_antes_visivel_custom: linha.dias_antes_visivel_custom,
      recorrencia_id: linha.id,
      e_instancia_recorrente: true,
    })
    .select("id")
    .single();

  if (base.error) {
    // 23505 = índice único (recorrencia_id, data): outra carga já criou.
    if (base.error.code === "23505") return false;
    throw new Error(
      `Falha ao criar a instância recorrente: ${base.error.message}`,
    );
  }
  const atividadeId = base.data.id as string;

  const detalhe =
    linha.atividade_tipo === "compromisso"
      ? await supabase.from("atividade_compromisso").insert({
          atividade_id: atividadeId,
          escritorio_id: linha.escritorio_id,
          hora: linha.hora,
          local: linha.local,
          duracao_estimada_min: linha.duracao_estimada_min,
        })
      : await supabase.from("atividade_monitoramento").insert({
          atividade_id: atividadeId,
          escritorio_id: linha.escritorio_id,
          alvo: linha.alvo,
        });

  if (detalhe.error) {
    throw new Error(
      `Instância criada, mas falhou o detalhe: ${detalhe.error.message}`,
    );
  }
  return true;
}

// Se a série tem fim (data/ocorrências), já gerou tudo e nada está no futuro,
// marca ativa=false — para não varrer à toa em toda carga da agenda.
async function encerrarSeSerieCompletaNoPassado(
  supabase: SupabaseClient,
  linha: Record<string, unknown>,
  regra: RegraRecorrencia,
  todasAsDatas: string[],
  hoje: string,
): Promise<void> {
  if (regra.termino.tipo === "indefinido") return;

  const previstas = ocorrenciasAte(regra, somarDias(hoje, 3650));
  const geradas = new Set(todasAsDatas);
  const tudoGerado = previstas.every((d) => geradas.has(d));
  const tudoNoPassado = previstas.every((d) => compararDatas(d, hoje) < 0);

  if (tudoGerado && tudoNoPassado) {
    await supabase
      .from("atividade_recorrencia")
      .update({ ativa: false })
      .eq("id", linha.id as string);
  }
}

function colunasDaRegra(regra: RegraRecorrencia): Record<string, unknown> {
  const p = regra.periodicidade;
  return {
    data_base: regra.dataBase,
    periodicidade_tipo: p.tipo,
    intervalo_cada: p.tipo === "intervalo" ? p.cada : null,
    intervalo_unidade: p.tipo === "intervalo" ? p.unidade : null,
    dias_da_semana: p.tipo === "semanal" ? p.diasDaSemana : null,
    dia_do_mes: p.tipo === "mensal" ? p.diaDoMes : null,
    termino_tipo: regra.termino.tipo,
    termino_ate: regra.termino.tipo === "data" ? regra.termino.ate : null,
    termino_ocorrencias:
      regra.termino.tipo === "ocorrencias" ? regra.termino.total : null,
  };
}

export function regraDaLinha(linha: Record<string, unknown>): RegraRecorrencia {
  const tipo = linha.periodicidade_tipo as Periodicidade["tipo"];
  let periodicidade: Periodicidade;
  if (tipo === "intervalo") {
    periodicidade = {
      tipo: "intervalo",
      cada: Number(linha.intervalo_cada),
      unidade: linha.intervalo_unidade as "dias" | "semanas" | "meses",
    };
  } else if (tipo === "semanal") {
    periodicidade = {
      tipo: "semanal",
      diasDaSemana: ((linha.dias_da_semana as number[] | null) ?? []).map(Number),
    };
  } else {
    periodicidade = { tipo: "mensal", diaDoMes: Number(linha.dia_do_mes) };
  }

  const terminoTipo = linha.termino_tipo as Termino["tipo"];
  let termino: Termino;
  if (terminoTipo === "data") {
    termino = { tipo: "data", ate: linha.termino_ate as string };
  } else if (terminoTipo === "ocorrencias") {
    termino = {
      tipo: "ocorrencias",
      total: Number(linha.termino_ocorrencias),
    };
  } else {
    termino = { tipo: "indefinido" };
  }

  return { dataBase: linha.data_base as string, periodicidade, termino };
}

function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : v ? [v] : [];
}
function um<T>(v: unknown): T | null {
  if (Array.isArray(v)) return (v[0] as T) ?? null;
  return (v as T) ?? null;
}
