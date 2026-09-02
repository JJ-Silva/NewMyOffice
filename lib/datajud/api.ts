// Cliente da API pública do DataJud (CNJ) — metadados de processo por número.
//
//   POST https://api-publica.datajud.cnj.jus.br/api_publica_<alias>/_search
//   Authorization: APIKey <chave pública do CNJ>
//   body: { "query": { "match": { "numeroProcesso": "<20 dígitos>" } } }
//
// A chave é PÚBLICA (o CNJ publica na wiki — sem cadastro, só limite de uso).
// Dá para trocar por env DATAJUD_API_KEY se o CNJ rotacionar.
//
// É melhor esforço: se falhar/timeout/não achar, devolve null e o usuário
// preenche à mão. Roda na região gru1 (Brasil) — ver vercel.json.
//
// Não é lib/db nem lib/domain — é um cliente HTTP de serviço externo.

import { identificarTribunal } from "@/lib/domain/tribunais-cnj";

const BASE = "https://api-publica.datajud.cnj.jus.br";
const TIMEOUT_MS = 12_000;

// Chave pública do CNJ (https://datajud-wiki.cnj.jus.br/api-publica/acesso).
// O CNJ rotaciona de tempos em tempos — se parar de funcionar, atualize aqui
// ou defina a env DATAJUD_API_KEY.
const CHAVE_PUBLICA =
  "cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==";

function chave(): string {
  return process.env.DATAJUD_API_KEY || CHAVE_PUBLICA;
}

// O "alias" do índice DataJud para cada tribunal.
// Ex.: TJSP → api_publica_tjsp · TRF3 → api_publica_trf3 · TRT15 → api_publica_trt15
// STF, CNJ e as circunscrições militares não têm índice útil → null.
export function aliasDatajud(segmento: number, tribunal: number): string | null {
  const id = identificarTribunal({ segmento, tribunal });
  if (!id) return null;

  switch (segmento) {
    case 1: // STF — não está no DataJud
    case 2: // CNJ
      return null;
    case 3:
      return "stj";
    case 7:
      return tribunal === 0 ? "stm" : null; // circunscrições não
    case 4:
      return tribunal >= 1 && tribunal <= 6 ? `trf${tribunal}` : null;
    case 5:
      return tribunal === 0 ? "tst" : `trt${tribunal}`;
    case 6:
      return tribunal === 0
        ? "tse"
        : `tre-${id.sigla.replace("TRE-", "").toLowerCase()}`;
    case 8:
      return id.sigla.toLowerCase(); // tjsp, tjrj, tjdft…
    case 9:
      return `tjm${id.sigla.replace("TJM-", "").toLowerCase()}`; // tjmmg, tjmsp
    default:
      return null;
  }
}

export type ProcessoDatajudBruto = Record<string, unknown>;

// Busca o processo pelo número. Devolve o `_source` do 1º hit, ou null.
export async function buscarProcessoNoDatajud(args: {
  numeroDigitos: string; // 20 dígitos, sem pontuação
  segmento: number;
  tribunal: number;
}): Promise<ProcessoDatajudBruto | null> {
  const alias = aliasDatajud(args.segmento, args.tribunal);
  if (!alias) return null;

  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), TIMEOUT_MS);
  try {
    const resposta = await fetch(
      `${BASE}/api_publica_${alias}/_search`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `APIKey ${chave()}`,
        },
        body: JSON.stringify({
          size: 1,
          query: { match: { numeroProcesso: args.numeroDigitos } },
        }),
        signal: controle.signal,
      },
    );
    if (!resposta.ok) {
      throw new Error(`DataJud respondeu ${resposta.status}`);
    }
    const dados = (await resposta.json()) as {
      hits?: { hits?: { _source?: ProcessoDatajudBruto }[] };
    };
    return dados.hits?.hits?.[0]?._source ?? null;
  } finally {
    clearTimeout(timer);
  }
}

// Nome do município pelo código IBGE (para virar a "comarca"). Melhor esforço.
export async function nomeMunicipioIbge(
  codigo: number,
): Promise<string | null> {
  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), 6_000);
  try {
    const r = await fetch(
      `https://servicodados.ibge.gov.br/api/v1/localidades/municipios/${codigo}`,
      { signal: controle.signal },
    );
    if (!r.ok) return null;
    const m = (await r.json()) as { nome?: unknown };
    return typeof m.nome === "string" ? m.nome : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
