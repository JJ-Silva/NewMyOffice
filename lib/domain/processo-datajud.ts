// Normaliza a resposta do DataJud (lib/datajud/api.ts) para os campos do
// cadastro de processo judicial. Puro — sem I/O.

export type ProcessoDatajud = {
  numeroDigitos: string | null;
  classe: string | null; // "Procedimento Comum Cível"
  assunto: string | null; // 1º assunto ("Seguro")
  orgaoJulgador: string | null; // "2ª Vara Cível"
  municipioIbge: number | null; // código IBGE do órgão
  grau: string | null; // "G1" | "G2" | "GS" ...
  dataAjuizamento: string | null; // 'AAAA-MM-DD'
};

function texto(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

// O DataJud manda data como "20240603155810" (AAAAMMDDHHmmss) ou ISO.
function normalizarData(v: unknown): string | null {
  const s = texto(v);
  if (!s) return null;
  const so8 = s.replace(/\D/g, "").slice(0, 8);
  if (so8.length === 8) {
    return `${so8.slice(0, 4)}-${so8.slice(4, 6)}-${so8.slice(6, 8)}`;
  }
  return null;
}
function um<T>(v: unknown): T | null {
  return Array.isArray(v) ? ((v[0] as T) ?? null) : null;
}

export function normalizarProcessoDatajud(
  bruto: Record<string, unknown> | null | undefined,
): ProcessoDatajud | null {
  if (!bruto) return null;

  const classe = bruto.classe as { nome?: unknown } | undefined;
  const assunto = um<{ nome?: unknown }>(bruto.assuntos);
  const orgao = bruto.orgaoJulgador as
    | { nome?: unknown; codigoMunicipioIBGE?: unknown }
    | undefined;

  const dataAjuizamento = normalizarData(bruto.dataAjuizamento);

  const municipio = Number(orgao?.codigoMunicipioIBGE);

  return {
    numeroDigitos: texto(bruto.numeroProcesso),
    classe: texto(classe?.nome),
    assunto: texto(assunto?.nome),
    orgaoJulgador: texto(orgao?.nome),
    municipioIbge: Number.isFinite(municipio) && municipio > 0 ? municipio : null,
    grau: texto(bruto.grau),
    dataAjuizamento,
  };
}

// "G1" → "1º grau" · "G2" → "2º grau" · "JE" → "Juizado Especial"
export function descreverGrau(grau: string | null): string | null {
  if (!grau) return null;
  const mapa: Record<string, string> = {
    G1: "1º grau",
    G2: "2º grau",
    GS: "Instância superior",
    JE: "Juizado Especial",
    TR: "Turma Recursal",
  };
  return mapa[grau.toUpperCase()] ?? grau;
}

// Os campos que o formulário de processo judicial pré-preenche a partir do
// DataJud. `comarca` vem do nome do município (resolvido no cliente da API).
export type CamposSugeridosDatajud = {
  tipoAcao: string | null;
  assunto: string | null;
  vara: string | null;
  comarca: string | null;
  instancia: string | null;
  dataDistribuicao: string | null;
};

export function sugerirCamposDoProcesso(
  dj: ProcessoDatajud,
  nomeMunicipio: string | null,
): CamposSugeridosDatajud {
  return {
    tipoAcao: dj.classe,
    assunto: dj.assunto,
    vara: dj.orgaoJulgador,
    comarca: nomeMunicipio,
    instancia: descreverGrau(dj.grau),
    dataDistribuicao: dj.dataAjuizamento,
  };
}
