// Cliente da API pública do DJEN (Comunica API do CNJ).
// Diário de Justiça Eletrônico Nacional — as intimações/publicações por OAB.
//
// Endpoint público, sem autenticação:
//   GET https://comunicaapi.pje.jus.br/api/v1/comunicacao
//   ?numeroOab=515392&ufOab=SP
//   &dataDisponibilizacaoInicio=2026-08-01&dataDisponibilizacaoFim=2026-08-31
//   &itensPorPagina=100&pagina=1
//
// Resposta: { status, message, count, items: [...] }. `count` = total de
// resultados da consulta; a página traz até `itensPorPagina`.
//
// Não é lib/db (não fala com o Supabase) nem lib/domain (faz I/O). É um cliente
// HTTP de um serviço externo — um arquivo, requisição visível.

import { normalizarCnj, limparTexto } from "@/lib/domain/publicacao";

const BASE = "https://comunicaapi.pje.jus.br/api/v1/comunicacao";
const ITENS_POR_PAGINA = 100;
const MAX_PAGINAS = 30; // trava de segurança (30 × 100 = 3000 publicações)
const TIMEOUT_MS = 25_000;

export type OabConsulta = { numero: string; uf: string };

// O que o resto do sistema usa — já normalizado.
export type ComunicacaoDjen = {
  djenId: number;
  hash: string | null;
  dataDisponibilizacao: string; // 'AAAA-MM-DD'
  siglaTribunal: string | null;
  nomeOrgao: string | null;
  tipoComunicacao: string | null;
  nomeClasse: string | null;
  numeroProcesso: string | null; // dígitos, como veio
  cnj: string | null; // formatado (ou null se não der para formatar)
  texto: string; // limpo (sem HTML)
  textoOriginal: string; // bruto
  link: string | null;
  meio: string | null;
};

// Busca as comunicações de todas as OABs no período. Deduplica pelo id do DJEN
// (a mesma publicação pode voltar em duas OABs do mesmo escritório).
export async function buscarComunicacoes(args: {
  oabs: OabConsulta[];
  dataInicio: string; // 'AAAA-MM-DD'
  dataFim: string;
}): Promise<ComunicacaoDjen[]> {
  const porId = new Map<number, ComunicacaoDjen>();

  for (const oab of args.oabs) {
    for (const bruto of await buscarUmaOab(oab, args.dataInicio, args.dataFim)) {
      const c = normalizar(bruto);
      if (c && !porId.has(c.djenId)) {
        porId.set(c.djenId, c);
      }
    }
  }

  return [...porId.values()].sort((a, b) =>
    b.dataDisponibilizacao.localeCompare(a.dataDisponibilizacao),
  );
}

// ── interno ────────────────────────────────────────────────────────────────
type ItemBruto = Record<string, unknown>;

async function buscarUmaOab(
  oab: OabConsulta,
  dataInicio: string,
  dataFim: string,
): Promise<ItemBruto[]> {
  const acumulado: ItemBruto[] = [];

  for (let pagina = 1; pagina <= MAX_PAGINAS; pagina++) {
    const url = new URL(BASE);
    url.searchParams.set("numeroOab", oab.numero.replace(/\D/g, ""));
    url.searchParams.set("ufOab", oab.uf.toUpperCase());
    url.searchParams.set("dataDisponibilizacaoInicio", dataInicio);
    url.searchParams.set("dataDisponibilizacaoFim", dataFim);
    url.searchParams.set("itensPorPagina", String(ITENS_POR_PAGINA));
    url.searchParams.set("pagina", String(pagina));

    const dados = await pegarJson(url);
    const items = Array.isArray(dados.items) ? (dados.items as ItemBruto[]) : [];
    acumulado.push(...items);

    const total = typeof dados.count === "number" ? dados.count : items.length;
    if (items.length < ITENS_POR_PAGINA || acumulado.length >= total) {
      break;
    }
  }

  return acumulado;
}

async function pegarJson(url: URL): Promise<{ count?: number; items?: unknown }> {
  const controle = new AbortController();
  const t = setTimeout(() => controle.abort(), TIMEOUT_MS);
  try {
    const resposta = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controle.signal,
    });
    if (!resposta.ok) {
      throw new Error(`DJEN respondeu ${resposta.status} ${resposta.statusText}`);
    }
    return (await resposta.json()) as { count?: number; items?: unknown };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("A busca no DJEN demorou demais (timeout). Tente de novo.");
    }
    throw e instanceof Error
      ? new Error(`Falha ao consultar o DJEN: ${e.message}`)
      : new Error("Falha ao consultar o DJEN.");
  } finally {
    clearTimeout(t);
  }
}

function normalizar(bruto: ItemBruto): ComunicacaoDjen | null {
  const djenId = Number(bruto.id);
  if (!Number.isFinite(djenId)) return null;

  const numeroProcesso =
    texto(bruto.numero_processo) ?? texto(bruto.numeroprocessocommascara);
  const textoOriginal = texto(bruto.texto) ?? "";

  return {
    djenId,
    hash: texto(bruto.hash),
    dataDisponibilizacao: normalizarData(bruto.data_disponibilizacao),
    siglaTribunal: texto(bruto.siglaTribunal),
    nomeOrgao: texto(bruto.nomeOrgao),
    tipoComunicacao: texto(bruto.tipoComunicacao) ?? texto(bruto.tipoDocumento),
    nomeClasse: texto(bruto.nomeClasse),
    numeroProcesso: numeroProcesso ? numeroProcesso.replace(/\D/g, "") : null,
    cnj: normalizarCnj({
      cnj: texto(bruto.numeroprocessocommascara),
      numeroProcesso: numeroProcesso ?? null,
    }),
    texto: limparTexto(textoOriginal),
    textoOriginal,
    link: texto(bruto.link),
    meio: texto(bruto.meio),
  };
}

function texto(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

// A API manda 'AAAA-MM-DD' em data_disponibilizacao e 'DD/MM/AAAA' em
// datadisponibilizacao. Aceita as duas.
function normalizarData(v: unknown): string {
  const s = texto(v);
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return s.slice(0, 10);
}
