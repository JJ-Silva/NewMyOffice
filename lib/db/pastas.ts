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

// ── helpers de normalização do retorno do PostgREST ────────────────────────
type Registro = Record<string, unknown>;

function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : v ? [v] : [];
}

function um<T>(v: unknown): T | null {
  if (Array.isArray(v)) return (v[0] as T) ?? null;
  return (v as T) ?? null;
}
