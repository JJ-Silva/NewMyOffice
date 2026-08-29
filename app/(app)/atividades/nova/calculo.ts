// Lógica compartilhada entre a prévia (page.tsx, via GET) e o salvamento
// (acoes.ts). NÃO é "use server" — são funções normais.
//
// Regra de ouro: o salvamento recalcula tudo do zero. Nada do que vem do
// formulário sobre datas é usado sem recálculo.

import type { SupabaseClient } from "@supabase/supabase-js";
import { calcularPrazo, type ResultadoCalculoPrazo } from "@/lib/domain/prazo";
import { carregarConfiguracao } from "@/lib/db/configuracao";
import {
  buscarTipoDeAtividade,
  type TipoAtividadeCatalogo,
} from "@/lib/db/tipos-atividade";
import { carregarCalendarioDoTribunal } from "@/lib/db/calendario";

export type EventoTipo =
  | "disponibilizacao_djen"
  | "intimacao_pessoal"
  | "juntada"
  | "ciencia"
  | "outro";

export const EVENTOS: { valor: EventoTipo; label: string }[] = [
  { valor: "disponibilizacao_djen", label: "Disponibilização no DJEN" },
  { valor: "intimacao_pessoal", label: "Intimação pessoal" },
  { valor: "juntada", label: "Juntada" },
  { valor: "ciencia", label: "Ciência" },
  { valor: "outro", label: "Outro" },
];

export type CamposPrazo = {
  pastaId: string;
  processoId: string;
  tipoAtividadeId: string;
  tribunalId: string | null;
  eventoTipo: EventoTipo;
  eventoData: string; // 'AAAA-MM-DD'
  dobro: boolean;
  diasInformado: number | null;
  titulo: string;
};

export function lerCampos(get: (chave: string) => string | null): CamposPrazo {
  const s = (chave: string) => (get(chave) ?? "").toString().trim();
  const diasRaw = s("dias");
  const dias = diasRaw ? Math.max(1, Math.trunc(Number(diasRaw))) : null;
  return {
    pastaId: s("pasta"),
    processoId: s("processo"),
    tipoAtividadeId: s("tipo"),
    tribunalId: s("tribunal") || null,
    eventoTipo: (s("evento_tipo") || "disponibilizacao_djen") as EventoTipo,
    eventoData: s("evento_data"),
    dobro: s("dobro") === "1",
    diasInformado: Number.isFinite(dias) ? dias : null,
    titulo: s("titulo"),
  };
}

export type CalculoPronto = {
  tipo: TipoAtividadeCatalogo;
  natureza: "processual" | "interna";
  dias: number;
  margem: number;
  hoje: string;
  resultado: ResultadoCalculoPrazo;
};

export async function calcular(
  supabase: SupabaseClient,
  escritorioId: string,
  campos: CamposPrazo,
  hoje: string,
): Promise<{ ok: true; dados: CalculoPronto } | { ok: false; erro: string }> {
  if (!campos.pastaId || !campos.processoId) {
    return { ok: false, erro: "Escolha a pasta e o processo." };
  }
  if (!campos.tipoAtividadeId) {
    return { ok: false, erro: "Escolha o tipo de prazo." };
  }

  const tipo = await buscarTipoDeAtividade(supabase, campos.tipoAtividadeId);
  if (!tipo || tipo.aplica_a !== "prazo") {
    return { ok: false, erro: "Tipo de prazo inválido." };
  }

  const natureza = tipo.natureza ?? "processual";
  if (natureza === "material") {
    return {
      ok: false,
      erro: "Prazo material não é calculado no v1 — informe a data direto (fora desta etapa).",
    };
  }

  const dias = campos.diasInformado ?? tipo.dias_padrao;
  if (dias === null || dias < 1) {
    return { ok: false, erro: "Informe quantos dias tem o prazo." };
  }
  if (!campos.eventoData) {
    return { ok: false, erro: "Informe a data do evento (termo inicial)." };
  }
  if (natureza === "processual" && !campos.tribunalId) {
    return {
      ok: false,
      erro: "Prazo processual precisa de um tribunal — é o calendário de feriados do cálculo.",
    };
  }

  const config = await carregarConfiguracao(supabase, escritorioId);
  const calendario = await carregarCalendarioDoTribunal(
    supabase,
    escritorioId,
    campos.tribunalId,
  );

  const resultado = calcularPrazo({
    natureza,
    dataInicial: campos.eventoData,
    dias,
    dobro: campos.dobro,
    excluirFeriados: true,
    margem: config.margem_prazo_interno_dias,
    calendario,
    hoje,
  });

  return {
    ok: true,
    dados: {
      tipo,
      natureza,
      dias,
      margem: config.margem_prazo_interno_dias,
      hoje,
      resultado,
    },
  };
}
