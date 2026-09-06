// Montagem do fio da Tramitação para exibição (balões de chat agrupados por
// dia). Fica fora de lib/domain porque depende de fuso/relógio (instanteNoBrasil)
// — mas é só transformação de dados, testável.

import type { AndamentoItem } from "@/lib/db/andamentos";
import { instanteNoBrasil } from "@/lib/hoje";
import { nomeDoDiaDaSemana } from "@/lib/domain/datas";

export type MensagemFio = {
  id: string;
  texto: string;
  autorNome: string; // "Sistema" já resolvido
  autorPapel: string | null; // rótulo do autor, ou nota do sistema
  iniciais: string;
  cor: string; // hex do avatar / nome
  ehMeu: boolean; // balão à direita, verde
  hora: string; // 'HH:MM' no fuso do Brasil
  processoNumero: string | null; // etiqueta "⚖ nº" (só na vista "caso")
  chip: { href: string; texto: string } | null;
};

export type DiaFio = { chave: string; rotulo: string; mensagens: MensagemFio[] };

// Cores estáveis por autor (mesmo membro → mesma cor). Sistema = teal.
const PALETA = [
  "#6D4AAE", "#1D6FA5", "#B45309", "#15803D", "#0E7490",
  "#B91C1C", "#7C5CBF", "#8A6D00", "#475569",
];
const COR_SISTEMA = "#00727E";

function corDoAutor(membroId: string | null): string {
  if (!membroId) return COR_SISTEMA;
  let h = 0;
  for (let i = 0; i < membroId.length; i++) {
    h = (h * 31 + membroId.charCodeAt(i)) >>> 0;
  }
  return PALETA[h % PALETA.length];
}

function iniciaisDe(nome: string): string {
  const p = nome.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return "?";
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

const CHIP_TIPO: Record<string, string> = {
  prazo: "⏳ ver prazo",
  compromisso: "⏳ ver compromisso",
  monitoramento: "⏳ ver monitoramento",
};

function chipDe(a: AndamentoItem): MensagemFio["chip"] {
  if (a.atividadeId) {
    return {
      href: `/agenda/${a.atividadeId}`,
      texto: CHIP_TIPO[a.atividadeTipo ?? ""] ?? "⏳ ver atividade",
    };
  }
  if (a.publicacaoId) {
    return { href: `/publicacoes/${a.publicacaoId}`, texto: "📄 ver publicação" };
  }
  return null;
}

function rotuloDoDia(dia: string, hoje: string): string {
  if (dia === hoje) return "Hoje";
  const [y, m, d] = hoje.split("-").map(Number);
  const ontem = new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
  if (dia === ontem) return "Ontem";
  const [yy, mm, dd] = dia.split("-");
  return `${dd}/${mm}/${yy} · ${nomeDoDiaDaSemana(dia)}`;
}

export function montarFio(
  andamentos: AndamentoItem[],
  opts: { meuMembroId: string; hoje: string; mostrarProcesso: boolean },
): DiaFio[] {
  const dias: DiaFio[] = [];
  for (const a of andamentos) {
    const { data, hora } = instanteNoBrasil(a.criadoEm);
    let g = dias.find((x) => x.chave === data);
    if (!g) {
      g = { chave: data, rotulo: rotuloDoDia(data, opts.hoje), mensagens: [] };
      dias.push(g);
    }
    const doSistema = a.autorMembroId === null;
    g.mensagens.push({
      id: a.id,
      texto: a.texto,
      autorNome: a.autorNome ?? "Sistema",
      autorPapel: doSistema ? "publicação automática" : a.autorPapel,
      iniciais: doSistema ? "MO" : iniciaisDe(a.autorNome ?? "?"),
      cor: corDoAutor(a.autorMembroId),
      ehMeu: a.autorMembroId !== null && a.autorMembroId === opts.meuMembroId,
      hora,
      processoNumero: opts.mostrarProcesso ? a.processoNumero : null,
      chip: chipDe(a),
    });
  }
  return dias;
}
