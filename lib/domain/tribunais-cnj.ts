// Identifica o tribunal a partir dos componentes do número CNJ
// (Resolução CNJ nº 65/2008, art. 1º). O número já traz o segmento (J, 1 dígito)
// e o tribunal (TR, 2 dígitos) — não faz sentido o usuário cadastrar isso à mão.
//
// `codigo` = segmento*100 + tribunal — um inteiro estável por tribunal
// (826 = TJSP, 500 = TST, 403 = TRF3ª, 515 = TRT15ª).
//
// TypeScript puro, sem dependências. Dado de referência; muda raríssimo
// (o TRF da 6ª Região, criado em 2022, foi a última novidade).

export type TribunalCnj = {
  codigo: number;
  sigla: string;
  nome: string;
};

// UFs na ordem do CNJ (segmentos estadual e eleitoral). Índice + 1 = código TR.
// [sigla, "artigo Estado"] — o artigo já vem certo para compor o nome do tribunal.
const UFS: [string, string][] = [
  ["AC", "do Acre"],
  ["AL", "de Alagoas"],
  ["AP", "do Amapá"],
  ["AM", "do Amazonas"],
  ["BA", "da Bahia"],
  ["CE", "do Ceará"],
  ["DF", "do Distrito Federal"],
  ["ES", "do Espírito Santo"],
  ["GO", "de Goiás"],
  ["MA", "do Maranhão"],
  ["MT", "de Mato Grosso"],
  ["MS", "de Mato Grosso do Sul"],
  ["MG", "de Minas Gerais"],
  ["PA", "do Pará"],
  ["PB", "da Paraíba"],
  ["PR", "do Paraná"],
  ["PE", "de Pernambuco"],
  ["PI", "do Piauí"],
  ["RJ", "do Rio de Janeiro"],
  ["RN", "do Rio Grande do Norte"],
  ["RS", "do Rio Grande do Sul"],
  ["RO", "de Rondônia"],
  ["RR", "de Roraima"],
  ["SC", "de Santa Catarina"],
  ["SE", "de Sergipe"],
  ["SP", "de São Paulo"],
  ["TO", "do Tocantins"],
];

// Justiça do Trabalho — TR 00 = TST; 01..24 = TRT da Nª Região (com a sede).
const TRT_SEDE: Record<number, string> = {
  1: "RJ",
  2: "SP capital",
  3: "MG",
  4: "RS",
  5: "BA",
  6: "PE",
  7: "CE",
  8: "PA/AP",
  9: "PR",
  10: "DF/TO",
  11: "AM/RR",
  12: "SC",
  13: "PB",
  14: "RO/AC",
  15: "SP Campinas",
  16: "MA",
  17: "ES",
  18: "GO",
  19: "AL",
  20: "SE",
  21: "RN",
  22: "PI",
  23: "MT",
  24: "MS",
};

function cod(segmento: number, tribunal: number): number {
  return segmento * 100 + tribunal;
}

export function identificarTribunal(p: {
  segmento: number;
  tribunal: number;
}): TribunalCnj | null {
  const { segmento, tribunal } = p;
  const codigo = cod(segmento, tribunal);

  switch (segmento) {
    // Tribunais superiores — sempre TR = 00.
    case 1:
      return tribunal === 0
        ? { codigo, sigla: "STF", nome: "Supremo Tribunal Federal" }
        : null;
    case 2:
      return tribunal === 0
        ? { codigo, sigla: "CNJ", nome: "Conselho Nacional de Justiça" }
        : null;
    case 3:
      return tribunal === 0
        ? { codigo, sigla: "STJ", nome: "Superior Tribunal de Justiça" }
        : null;

    case 4: {
      // Justiça Federal — TRFs das 6 regiões
      if (tribunal >= 1 && tribunal <= 6) {
        return {
          codigo,
          sigla: `TRF${tribunal}`,
          nome: `Tribunal Regional Federal da ${tribunal}ª Região`,
        };
      }
      if (tribunal === 90) {
        return { codigo, sigla: "CJF", nome: "Conselho da Justiça Federal" };
      }
      return null;
    }

    case 5: {
      // Justiça do Trabalho
      if (tribunal === 0) {
        return { codigo, sigla: "TST", nome: "Tribunal Superior do Trabalho" };
      }
      const sede = TRT_SEDE[tribunal];
      if (sede) {
        return {
          codigo,
          sigla: `TRT${tribunal}`,
          nome: `Tribunal Regional do Trabalho da ${tribunal}ª Região (${sede})`,
        };
      }
      return null;
    }

    case 6: {
      // Justiça Eleitoral
      if (tribunal === 0) {
        return {
          codigo,
          sigla: "TSE",
          nome: "Tribunal Superior Eleitoral",
        };
      }
      const uf = UFS[tribunal - 1];
      if (uf) {
        return {
          codigo,
          sigla: `TRE-${uf[0]}`,
          nome: `Tribunal Regional Eleitoral ${uf[1]}`,
        };
      }
      return null;
    }

    case 7: {
      // Justiça Militar da União
      if (tribunal === 0) {
        return { codigo, sigla: "STM", nome: "Superior Tribunal Militar" };
      }
      if (tribunal >= 1 && tribunal <= 12) {
        return {
          codigo,
          sigla: `${tribunal}ª CJM`,
          nome: `${tribunal}ª Circunscrição Judiciária Militar`,
        };
      }
      return null;
    }

    case 8: {
      // Justiça Estadual — Tribunais de Justiça
      const uf = UFS[tribunal - 1];
      if (uf) {
        const sigla = uf[0] === "DF" ? "TJDFT" : `TJ${uf[0]}`;
        const nome =
          uf[0] === "DF"
            ? "Tribunal de Justiça do Distrito Federal e dos Territórios"
            : `Tribunal de Justiça ${uf[1]}`;
        return { codigo, sigla, nome };
      }
      return null;
    }

    case 9: {
      // Justiça Militar Estadual — só MG, RS e SP têm TJM próprio
      const tjm: Record<number, [string, string]> = {
        13: ["TJM-MG", "Tribunal de Justiça Militar de Minas Gerais"],
        21: ["TJM-RS", "Tribunal de Justiça Militar do Rio Grande do Sul"],
        26: ["TJM-SP", "Tribunal de Justiça Militar de São Paulo"],
      };
      const t = tjm[tribunal];
      return t ? { codigo, sigla: t[0], nome: t[1] } : null;
    }

    default:
      return null;
  }
}
