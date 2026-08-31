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
  titulo: string | null;
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

// ── Compromisso (audiência, reunião, perícia…) ─────────────────────────────
// Sem motor: a data é definida pelo usuário. (= AppointmentActivity)
export type NovoCompromisso = {
  escritorioId: string;
  processoId: string;
  tipoAtividadeId: string;
  titulo: string | null;
  responsavelId: string | null;
  data: string; // 'AAAA-MM-DD'
  hora: string | null; // 'HH:MM'
  local: string | null;
  duracaoEstimadaMin: number | null;
};

export async function criarCompromisso(
  supabase: SupabaseClient,
  c: NovoCompromisso,
): Promise<string> {
  const atividade = await supabase
    .from("atividade")
    .insert({
      escritorio_id: c.escritorioId,
      processo_id: c.processoId,
      tipo: "compromisso",
      tipo_atividade_id: c.tipoAtividadeId,
      titulo: c.titulo,
      data: c.data,
      responsavel_id: c.responsavelId,
      status: "pendente",
    })
    .select("id")
    .single();
  if (atividade.error) {
    throw new Error(`Falha ao gravar a atividade: ${atividade.error.message}`);
  }
  const atividadeId = atividade.data.id as string;

  const detalhe = await supabase.from("atividade_compromisso").insert({
    atividade_id: atividadeId,
    escritorio_id: c.escritorioId,
    hora: c.hora,
    local: c.local,
    duracao_estimada_min: c.duracaoEstimadaMin,
  });
  if (detalhe.error) {
    throw new Error(`Falha ao gravar o compromisso: ${detalhe.error.message}`);
  }
  return atividadeId;
}

// ── Monitoramento (verificar publicação, acompanhar andamento…) ────────────
// Sem motor: aparece na agenda no dia. (= MonitoringActivity)
export type NovoMonitoramento = {
  escritorioId: string;
  processoId: string;
  tipoAtividadeId: string;
  titulo: string | null;
  responsavelId: string | null;
  data: string; // 'AAAA-MM-DD' (dia da verificação)
  alvo: string | null;
};

export async function criarMonitoramento(
  supabase: SupabaseClient,
  m: NovoMonitoramento,
): Promise<string> {
  const atividade = await supabase
    .from("atividade")
    .insert({
      escritorio_id: m.escritorioId,
      processo_id: m.processoId,
      tipo: "monitoramento",
      tipo_atividade_id: m.tipoAtividadeId,
      titulo: m.titulo,
      data: m.data,
      responsavel_id: m.responsavelId,
      status: "pendente",
    })
    .select("id")
    .single();
  if (atividade.error) {
    throw new Error(`Falha ao gravar a atividade: ${atividade.error.message}`);
  }
  const atividadeId = atividade.data.id as string;

  const detalhe = await supabase.from("atividade_monitoramento").insert({
    atividade_id: atividadeId,
    escritorio_id: m.escritorioId,
    alvo: m.alvo,
  });
  if (detalhe.error) {
    throw new Error(
      `Falha ao gravar o monitoramento: ${detalhe.error.message}`,
    );
  }
  return atividadeId;
}
