// Número único de processo (CNJ) — Resolução CNJ nº 65/2008.
// Formato: NNNNNNN-DD.AAAA.J.TR.OOOO
//   NNNNNNN  sequencial (7 dígitos), reinicia por ano/origem
//   DD       dígito verificador (2 dígitos) — ISO 7064 MOD 97-10
//   AAAA     ano do registro
//   J        segmento do Judiciário (1 dígito)
//   TR       tribunal (2 dígitos)
//   OOOO     unidade de origem (4 dígitos)
//
// TypeScript puro, testado (plano §1.1). O dígito verificador é conferido, mas
// a decisão de gravar mesmo assim é do advogado (a UI avisa, não bloqueia).

export type Justica =
  | "estadual"
  | "federal"
  | "trabalho"
  | "eleitoral"
  | "militar"
  | "superior";

export type CnjPartes = {
  sequencial: number;
  digitoVerificador: number;
  ano: number;
  segmento: number;
  tribunal: number;
  origem: number;
};

export type CnjAnalisado = {
  formatado: string; // NNNNNNN-DD.AAAA.J.TR.OOOO
  partes: CnjPartes;
  digitoConfere: boolean;
  justica: Justica | null;
  descricaoSegmento: string;
};

const SEGMENTOS: Record<
  number,
  { descricao: string; justica: Justica | null }
> = {
  1: { descricao: "Supremo Tribunal Federal", justica: "superior" },
  2: { descricao: "Conselho Nacional de Justiça", justica: "superior" },
  3: { descricao: "Superior Tribunal de Justiça", justica: "superior" },
  4: { descricao: "Justiça Federal", justica: "federal" },
  5: { descricao: "Justiça do Trabalho", justica: "trabalho" },
  6: { descricao: "Justiça Eleitoral", justica: "eleitoral" },
  7: { descricao: "Justiça Militar da União", justica: "militar" },
  8: { descricao: "Justiça Estadual", justica: "estadual" },
  9: { descricao: "Justiça Militar Estadual", justica: "militar" },
};

// mod 97 processando dígito a dígito (o número tem 20 dígitos, estoura o Number).
function modulo97(digitos: string): number {
  let resto = 0;
  for (let i = 0; i < digitos.length; i++) {
    resto = (resto * 10 + (digitos.charCodeAt(i) - 48)) % 97;
  }
  return resto;
}

// DV esperado para um número de 18 dígitos (sequencial+ano+segmento+tribunal+origem).
function digitoVerificadorDe(dezoito: string): string {
  const sequencial = dezoito.slice(0, 7);
  const resto = dezoito.slice(7); // ano(4) + segmento(1) + tribunal(2) + origem(4)
  const dv = 98 - modulo97(sequencial + resto + "00");
  return String(dv).padStart(2, "0");
}

export function calcularDigitoVerificador(p: {
  sequencial: number;
  ano: number;
  segmento: number;
  tribunal: number;
  origem: number;
}): string {
  const dezoito =
    String(p.sequencial).padStart(7, "0") +
    String(p.ano).padStart(4, "0") +
    String(p.segmento).padStart(1, "0") +
    String(p.tribunal).padStart(2, "0") +
    String(p.origem).padStart(4, "0");
  return digitoVerificadorDe(dezoito);
}

// Monta o número formatado (calcula o DV).
export function montarCnj(p: {
  sequencial: number;
  ano: number;
  segmento: number;
  tribunal: number;
  origem: number;
}): string {
  const dv = calcularDigitoVerificador(p);
  return (
    `${String(p.sequencial).padStart(7, "0")}-${dv}.${String(p.ano).padStart(4, "0")}` +
    `.${p.segmento}.${String(p.tribunal).padStart(2, "0")}.${String(p.origem).padStart(4, "0")}`
  );
}

// Analisa uma entrada (formatada ou só dígitos).
export function analisarCnj(
  entrada: string,
): { ok: true; cnj: CnjAnalisado } | { ok: false; erro: string } {
  const limpo = (entrada ?? "").replace(/\D/g, "");
  if (limpo.length === 0) {
    return { ok: false, erro: "Informe o número do processo." };
  }
  if (limpo.length !== 20) {
    return {
      ok: false,
      erro: "O número CNJ tem 20 dígitos (NNNNNNN-DD.AAAA.J.TR.OOOO).",
    };
  }

  const sequencial = Number(limpo.slice(0, 7));
  const digitoVerificador = Number(limpo.slice(7, 9));
  const ano = Number(limpo.slice(9, 13));
  const segmento = Number(limpo.slice(13, 14));
  const tribunal = Number(limpo.slice(14, 16));
  const origem = Number(limpo.slice(16, 20));

  const dezoito = limpo.slice(0, 7) + limpo.slice(9);
  const digitoConfere = digitoVerificadorDe(dezoito) === limpo.slice(7, 9);

  const seg = SEGMENTOS[segmento];

  return {
    ok: true,
    cnj: {
      formatado:
        `${limpo.slice(0, 7)}-${limpo.slice(7, 9)}.${limpo.slice(9, 13)}` +
        `.${limpo.slice(13, 14)}.${limpo.slice(14, 16)}.${limpo.slice(16, 20)}`,
      partes: {
        sequencial,
        digitoVerificador,
        ano,
        segmento,
        tribunal,
        origem,
      },
      digitoConfere,
      justica: seg?.justica ?? null,
      descricaoSegmento: seg?.descricao ?? `segmento ${segmento} (desconhecido)`,
    },
  };
}
