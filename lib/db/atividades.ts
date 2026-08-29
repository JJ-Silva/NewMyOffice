// Acesso a dados: `atividade` (base) + `atividade_prazo` (detalhe) +
// `configuracao_contagem` (§3.6).
//
// "Prazo" na UI = uma linha de `atividade` (tipo='prazo') + `atividade_prazo`.
// A trigger `atividade_prazo_sincroniza_data` mantém `atividade.data` =
// `atividade_prazo.prazo_fatal`.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { MemoriaCalculo } from "@/lib/domain/prazo";

export type NovoPrazo = {
  escritorioId: string;
  processoId: string;
  tipoAtividadeId: string;
  titulo: string;
  responsavelId: string | null;
  tribunalId: string | null;
  // configuração da contagem
  natureza: "processual" | "material" | "interna";
  dias: number;
  dobro: boolean;
  excluirFeriados: boolean;
  // evento (termo inicial)
  eventoTipo:
    | "disponibilizacao_djen"
    | "intimacao_pessoal"
    | "juntada"
    | "ciencia"
    | "outro";
  eventoData: string; // 'AAAA-MM-DD'
  // resultado do motor (lib/domain/prazo.ts)
  prazoFatalCalculado: string;
  prazoInternoCalculado: string;
  prazoApertado: boolean;
  memoriaCalculo: MemoriaCalculo;
};

// Cria os 3 registros numa sequência. Retorna o id da atividade.
export async function criarPrazo(
  supabase: SupabaseClient,
  p: NovoPrazo,
): Promise<string> {
  // 1. configuracao_contagem
  const cfg = await supabase
    .from("configuracao_contagem")
    .insert({
      escritorio_id: p.escritorioId,
      dobro: p.dobro,
      natureza: p.natureza,
      dias: p.dias,
    })
    .select("id")
    .single();
  if (cfg.error) {
    throw new Error(`Falha ao gravar a contagem: ${cfg.error.message}`);
  }

  // 2. atividade (base). data = prazo fatal adotado (nasce = calculado).
  const atividade = await supabase
    .from("atividade")
    .insert({
      escritorio_id: p.escritorioId,
      processo_id: p.processoId,
      tipo: "prazo",
      tipo_atividade_id: p.tipoAtividadeId,
      titulo: p.titulo,
      data: p.prazoFatalCalculado,
      responsavel_id: p.responsavelId,
      status: "pendente",
    })
    .select("id")
    .single();
  if (atividade.error) {
    throw new Error(`Falha ao gravar a atividade: ${atividade.error.message}`);
  }
  const atividadeId = atividade.data.id as string;

  // 3. atividade_prazo (detalhe). Adotadas nascem = calculadas.
  const prazo = await supabase.from("atividade_prazo").insert({
    atividade_id: atividadeId,
    escritorio_id: p.escritorioId,
    configuracao_contagem_id: cfg.data.id as string,
    tribunal_id: p.tribunalId,
    evento_tipo: p.eventoTipo,
    evento_data: p.eventoData,
    excluir_feriados: p.excluirFeriados,
    prazo_fatal_calculado: p.prazoFatalCalculado,
    prazo_fatal: p.prazoFatalCalculado,
    prazo_interno_calculado: p.prazoInternoCalculado,
    prazo_interno: p.prazoInternoCalculado,
    prazo_apertado: p.prazoApertado,
    memoria_calculo: p.memoriaCalculo,
  });
  if (prazo.error) {
    throw new Error(`Falha ao gravar o prazo: ${prazo.error.message}`);
  }

  return atividadeId;
}
