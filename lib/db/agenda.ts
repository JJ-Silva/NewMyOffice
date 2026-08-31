// Acesso a dados: a agenda de atividades (§4 Bloco C).
//
// Etapa 1: só existem atividades tipo 'prazo'. A query já traz o contexto
// (pasta, cliente, tipo, responsável) e os campos do prazo que a lista usa
// para os estados visuais (prazo interno, apertado).

import type { SupabaseClient } from "@supabase/supabase-js";
import type { StatusAtividade } from "@/lib/domain/atividade";

export type FiltrosAgenda = {
  pastaId?: string;
  status?: StatusAtividade | "";
  tipo?: "prazo" | "compromisso" | "monitoramento" | "";
};

export type ItemAgenda = {
  id: string;
  titulo: string;
  tipo: "prazo" | "compromisso" | "monitoramento";
  data: string; // 'AAAA-MM-DD' (= prazo fatal adotado, para prazo)
  status: StatusAtividade;
  diasAntesVisivelCustom: number | null;
  prioridadeManual: "baixa" | "media" | "alta" | "urgente";
  pastaId: string;
  pastaCodigo: string;
  pastaNome: string | null;
  clienteNome: string | null;
  // processo ao qual a atividade está ligada (todo processo tem número:
  // geral = código da pasta, judicial = CNJ, administrativo = nº do órgão)
  processoTipo: "geral" | "judicial" | "administrativo";
  processoNumero: string | null;
  tipoAtividadeNome: string | null;
  responsavelNome: string | null;
  // só prazo:
  prazoInterno: string | null;
  prazoApertado: boolean;
  calculoDesatualizado: boolean;
  // instância de uma recorrência (Etapa 3a)?
  recorrente: boolean;
};

export async function listarAgenda(
  supabase: SupabaseClient,
  escritorioId: string,
  filtros: FiltrosAgenda = {},
): Promise<ItemAgenda[]> {
  let q = supabase
    .from("atividade")
    .select(
      `id, titulo, tipo, data, status, prioridade_manual, dias_antes_visivel_custom, recorrencia_id,
       tipo_atividade:tipo_atividade_id ( nome ),
       responsavel:responsavel_id ( usuario:usuario_id ( nome ) ),
       processo:processo_id (
         tipo, numero, pasta_id,
         pasta:pasta_id ( codigo, nome, pasta_cliente ( cliente:cliente_id ( nome ) ) )
       ),
       atividade_prazo ( prazo_interno, prazo_apertado, calculo_desatualizado )`,
    )
    .eq("escritorio_id", escritorioId)
    .is("deletado_em", null)
    .order("data", { ascending: true });

  if (filtros.status) {
    q = q.eq("status", filtros.status);
  }
  if (filtros.tipo) {
    q = q.eq("tipo", filtros.tipo);
  }

  const { data, error } = await q;
  if (error) {
    throw new Error(`Falha ao carregar a agenda: ${error.message}`);
  }

  let itens = (data ?? []).map((linha): ItemAgenda => {
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
    const prazo = um<{
      prazo_interno: string | null;
      prazo_apertado: boolean;
      calculo_desatualizado: boolean;
    }>(linha.atividade_prazo);
    const resp = um<{ usuario: unknown }>(linha.responsavel);

    return {
      id: linha.id as string,
      titulo: linha.titulo as string,
      tipo: linha.tipo as ItemAgenda["tipo"],
      data: linha.data as string,
      status: linha.status as StatusAtividade,
      diasAntesVisivelCustom:
        (linha.dias_antes_visivel_custom as number | null) ?? null,
      prioridadeManual:
        linha.prioridade_manual as ItemAgenda["prioridadeManual"],
      pastaId: processo?.pasta_id ?? "",
      pastaCodigo: pasta?.codigo ?? "—",
      pastaNome: pasta?.nome ?? null,
      clienteNome: cliente?.nome ?? null,
      processoTipo:
        (processo?.tipo as ItemAgenda["processoTipo"]) ?? "geral",
      processoNumero: (processo?.numero as string | null) ?? null,
      tipoAtividadeNome:
        um<{ nome: string }>(linha.tipo_atividade)?.nome ?? null,
      responsavelNome: um<{ nome: string }>(resp?.usuario)?.nome ?? null,
      prazoInterno: prazo?.prazo_interno ?? null,
      prazoApertado: prazo?.prazo_apertado ?? false,
      calculoDesatualizado: prazo?.calculo_desatualizado ?? false,
      recorrente: (linha.recorrencia_id as string | null) != null,
    };
  });

  if (filtros.pastaId) {
    itens = itens.filter((i) => i.pastaId === filtros.pastaId);
  }

  return itens;
}

// ── normalização do retorno do PostgREST ───────────────────────────────────
function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : v ? [v] : [];
}
function um<T>(v: unknown): T | null {
  if (Array.isArray(v)) return (v[0] as T) ?? null;
  return (v as T) ?? null;
}
