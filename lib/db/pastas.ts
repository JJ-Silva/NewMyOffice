// Acesso a dados: `pasta` + `pasta_cliente` (§3.4).
//
// Na criação: o trigger `pasta_preenche_codigo` gera ano/sequencial/codigo
// (AAAA/NNNNNN, reinicia por ano) e o trigger `pasta_cria_processo_geral`
// cria o processo 'geral'. O app só insere a pasta e os vínculos de cliente.

import type { SupabaseClient } from "@supabase/supabase-js";

export type PastaResumo = {
  id: string;
  codigo: string;
  nome: string | null;
  status: "ativa" | "arquivada" | "suspensa";
  area_nome: string | null;
  clientes: { id: string; nome: string }[];
  qtd_processos: number;
  qtd_prazos_abertos: number;
};

export async function listarPastas(
  supabase: SupabaseClient,
  escritorioId: string,
): Promise<PastaResumo[]> {
  const { data, error } = await supabase
    .from("pasta")
    .select(
      `id, codigo, nome, status,
       area:area_id ( nome ),
       pasta_cliente ( cliente:cliente_id ( id, nome ) ),
       processo ( id, deletado_em,
                  atividade ( id, tipo, status, deletado_em ) )`,
    )
    .eq("escritorio_id", escritorioId)
    .is("deletado_em", null)
    .order("ano", { ascending: false })
    .order("sequencial", { ascending: false });

  if (error) {
    throw new Error(`Falha ao listar pastas: ${error.message}`);
  }

  return (data ?? []).map((linha) => {
    const processos = arr(linha.processo).filter(
      (p) => (p as Registro).deletado_em === null,
    );
    let prazosAbertos = 0;
    for (const p of processos) {
      for (const a of arr((p as Registro).atividade)) {
        const at = a as Registro;
        if (
          at.deletado_em === null &&
          at.tipo === "prazo" &&
          (at.status === "pendente" || at.status === "em_andamento")
        ) {
          prazosAbertos++;
        }
      }
    }
    return {
      id: linha.id as string,
      codigo: linha.codigo as string,
      nome: (linha.nome as string | null) ?? null,
      status: linha.status as PastaResumo["status"],
      area_nome: um<{ nome: string }>(linha.area)?.nome ?? null,
      clientes: arr(linha.pasta_cliente)
        .map((v) => um<{ id: string; nome: string }>((v as Registro).cliente))
        .filter((c): c is { id: string; nome: string } => Boolean(c))
        .map((c) => ({ id: c.id, nome: c.nome })),
      qtd_processos: processos.length,
      qtd_prazos_abertos: prazosAbertos,
    };
  });
}

export type NovaPasta = {
  escritorioId: string;
  nome: string | null;
  areaId: string | null;
  objetivo: string | null;
  objeto: string | null;
  clienteIds: string[];
};

// Cria a pasta (código e processo geral vêm dos triggers) e vincula clientes.
// Retorna id e código da pasta nova.
export async function criarPasta(
  supabase: SupabaseClient,
  entrada: NovaPasta,
): Promise<{ id: string; codigo: string }> {
  const { data, error } = await supabase
    .from("pasta")
    .insert({
      escritorio_id: entrada.escritorioId,
      nome: entrada.nome,
      area_id: entrada.areaId,
      objetivo: entrada.objetivo,
      objeto: entrada.objeto,
    })
    .select("id, codigo")
    .single();

  if (error) {
    throw new Error(`Falha ao criar pasta: ${error.message}`);
  }

  if (entrada.clienteIds.length > 0) {
    const vinculos = entrada.clienteIds.map((clienteId) => ({
      pasta_id: data.id as string,
      cliente_id: clienteId,
    }));
    const { error: erroVinculo } = await supabase
      .from("pasta_cliente")
      .insert(vinculos);
    if (erroVinculo) {
      throw new Error(
        `Pasta criada, mas falhou ao vincular o cliente: ${erroVinculo.message}`,
      );
    }
  }

  return { id: data.id as string, codigo: data.codigo as string };
}

// ── Detalhe de uma pasta ──────────────────────────────────────────────────
export type PastaDetalhe = {
  id: string;
  codigo: string;
  nome: string | null;
  referencia_externa: string | null;
  area_id: string | null;
  area_nome: string | null;
  objetivo: string | null;
  objeto: string | null;
  status: "ativa" | "arquivada" | "suspensa";
  clientes: { id: string; nome: string }[];
};

export async function buscarPasta(
  supabase: SupabaseClient,
  escritorioId: string,
  id: string,
): Promise<PastaDetalhe | null> {
  const { data, error } = await supabase
    .from("pasta")
    .select(
      `id, codigo, nome, referencia_externa, area_id, objetivo, objeto, status,
       area:area_id ( nome ),
       pasta_cliente ( cliente:cliente_id ( id, nome ) )`,
    )
    .eq("escritorio_id", escritorioId)
    .eq("id", id)
    .is("deletado_em", null)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao carregar a pasta: ${error.message}`);
  }
  if (!data) return null;

  return {
    id: data.id as string,
    codigo: data.codigo as string,
    nome: (data.nome as string | null) ?? null,
    referencia_externa: (data.referencia_externa as string | null) ?? null,
    area_id: (data.area_id as string | null) ?? null,
    area_nome: um<{ nome: string }>(data.area)?.nome ?? null,
    objetivo: (data.objetivo as string | null) ?? null,
    objeto: (data.objeto as string | null) ?? null,
    status: data.status as PastaDetalhe["status"],
    clientes: arr(data.pasta_cliente)
      .map((v) => um<{ id: string; nome: string }>((v as Registro).cliente))
      .filter((c): c is { id: string; nome: string } => Boolean(c)),
  };
}

export async function atualizarPasta(
  supabase: SupabaseClient,
  id: string,
  campos: {
    nome: string | null;
    referenciaExterna: string | null;
    areaId: string | null;
    objetivo: string | null;
    objeto: string | null;
    status: "ativa" | "arquivada" | "suspensa";
  },
): Promise<void> {
  const { error } = await supabase
    .from("pasta")
    .update({
      nome: campos.nome,
      referencia_externa: campos.referenciaExterna,
      area_id: campos.areaId,
      objetivo: campos.objetivo,
      objeto: campos.objeto,
      status: campos.status,
    })
    .eq("id", id);
  if (error) {
    throw new Error(`Falha ao atualizar a pasta: ${error.message}`);
  }
}

// Soft-delete da pasta (§0: dado jurídico não se apaga de verdade). Some das
// listas; os processos e atividades ligados continuam no banco mas invisíveis.
export async function excluirPasta(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("pasta")
    .update({ deletado_em: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    throw new Error(`Falha ao excluir a pasta: ${error.message}`);
  }
}

export async function vincularCliente(
  supabase: SupabaseClient,
  pastaId: string,
  clienteId: string,
): Promise<void> {
  const { error } = await supabase
    .from("pasta_cliente")
    .insert({ pasta_id: pastaId, cliente_id: clienteId });
  if (error && error.code !== "23505") {
    throw new Error(`Falha ao vincular o cliente: ${error.message}`);
  }
}

export async function desvincularCliente(
  supabase: SupabaseClient,
  pastaId: string,
  clienteId: string,
): Promise<void> {
  const { error } = await supabase
    .from("pasta_cliente")
    .delete()
    .eq("pasta_id", pastaId)
    .eq("cliente_id", clienteId);
  if (error) {
    throw new Error(`Falha ao desvincular o cliente: ${error.message}`);
  }
}

// ── helpers de normalização do retorno do PostgREST ────────────────────────
type Registro = Record<string, unknown>;

function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : v ? [v] : [];
}

function um<T>(v: unknown): T | null {
  if (Array.isArray(v)) return (v[0] as T) ?? null;
  return (v as T) ?? null;
}
