// Regras puras sobre uma publicação do DJEN (Etapa 5). TypeScript puro.
//
//  - limparTexto: o DJEN às vezes manda HTML no texto; a triagem quer texto puro
//  - normalizarCnj: transforma o número do processo (mascarado ou só dígitos)
//    no formato CNJ NNNNNNN-DD.AAAA.J.TR.OOOO
//  - sugerirPrazo: lê o texto e ADIVINHA o tipo/dias do prazo — sempre uma
//    sugestão, o advogado confirma (nunca cria nada sozinho)

import { analisarCnj } from "./cnj";

// ── Texto ────────────────────────────────────────────────────────────────────
const ENTIDADES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&ordf;": "ª",
  "&ordm;": "º",
  "&aacute;": "á",
  "&eacute;": "é",
  "&iacute;": "í",
  "&oacute;": "ó",
  "&uacute;": "ú",
  "&atilde;": "ã",
  "&otilde;": "õ",
  "&acirc;": "â",
  "&ecirc;": "ê",
  "&ocirc;": "ô",
  "&ccedil;": "ç",
  "&Aacute;": "Á",
  "&Eacute;": "É",
  "&Iacute;": "Í",
  "&Oacute;": "Ó",
  "&Uacute;": "Ú",
  "&Atilde;": "Ã",
  "&Otilde;": "Õ",
  "&Ccedil;": "Ç",
};

export function limparTexto(bruto: string): string {
  if (!bruto) return "";
  let t = bruto;

  // <br>, </p>, </div>, </tr> viram quebra de linha antes de remover as tags
  t = t.replace(/<\s*(br|\/p|\/div|\/tr|\/h[1-6]|\/li)\s*\/?\s*>/gi, "\n");
  // remove qualquer outra tag
  t = t.replace(/<[^>]+>/g, " ");
  // entidades HTML
  t = t.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
  for (const [ent, ch] of Object.entries(ENTIDADES)) {
    t = t.split(ent).join(ch);
  }
  // espaços: colapsa, mas preserva parágrafos
  t = t.replace(/[ \t\r\f\v]+/g, " ");
  t = t.replace(/ +([.,;:!?)])/g, "$1"); // espaço antes de pontuação (herança das tags)
  t = t.replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n");
  return t.trim();
}

// Um resumo curto para a lista de triagem.
export function trecho(texto: string, limite = 240): string {
  const limpo = limparTexto(texto).replace(/\n+/g, " ");
  return limpo.length <= limite ? limpo : limpo.slice(0, limite - 1).trimEnd() + "…";
}

// ── CNJ ──────────────────────────────────────────────────────────────────────
export function normalizarCnj(item: {
  cnj: string | null;
  numeroProcesso: string | null;
}): string | null {
  const candidato = item.cnj ?? item.numeroProcesso ?? "";
  const analise = analisarCnj(candidato);
  return analise.ok ? analise.cnj.formatado : null;
}

// ── Sugestão de prazo a partir do texto ─────────────────────────────────────
export type SugestaoPrazo = {
  // nome aproximado de um tipo_atividade de prazo (para pré-selecionar no form)
  tipoProvavel: string | null;
  dias: number | null; // dias sugeridos (do texto ou do padrão do tipo)
  // frase curta para mostrar ao advogado explicando de onde veio
  explicacao: string;
};

const EXTENSO: Record<string, number> = {
  um: 1, dois: 2, tres: 3, três: 3, quatro: 4, cinco: 5, seis: 6, sete: 7,
  oito: 8, nove: 9, dez: 10, onze: 11, doze: 12, quinze: 15, vinte: 20,
  trinta: 30, sessenta: 60,
};

// Cada regra: se o texto casa, sugere um tipo (nome do catálogo) e dias.
const REGRAS: {
  padrao: RegExp;
  tipo: string;
  dias: number;
  rotulo: string;
}[] = [
  { padrao: /contrarraz[õo]es\s+(de\s+)?apela[çc][ãa]o/i, tipo: "Contrarrazões de apelação", dias: 15, rotulo: "contrarrazões de apelação" },
  { padrao: /contrarraz[õo]es/i, tipo: "Contrarrazões a REsp/RE", dias: 15, rotulo: "contrarrazões" },
  { padrao: /embargos\s+de\s+declara[çc][ãa]o/i, tipo: "Embargos de declaração", dias: 5, rotulo: "embargos de declaração" },
  { padrao: /r[ée]plica/i, tipo: "Réplica", dias: 15, rotulo: "réplica" },
  { padrao: /(apresentar|oferecer)\s+contesta[çc][ãa]o|para\s+contestar/i, tipo: "Contestação", dias: 15, rotulo: "contestação" },
  { padrao: /impugna[çc][ãa]o\s+ao\s+cumprimento/i, tipo: "Impugnação ao cumprimento de sentença", dias: 15, rotulo: "impugnação ao cumprimento" },
  { padrao: /embargos\s+[àa]\s+execu[çc][ãa]o/i, tipo: "Embargos à execução", dias: 15, rotulo: "embargos à execução" },
  { padrao: /(raz[õo]es\s+de\s+)?apela[çc][ãa]o|apelar/i, tipo: "Apelação", dias: 15, rotulo: "apelação" },
  { padrao: /agravo\s+de\s+instrumento/i, tipo: "Agravo de instrumento", dias: 15, rotulo: "agravo de instrumento" },
  { padrao: /recurso\s+(especial|extraordin[áa]rio)/i, tipo: "Recurso especial / extraordinário", dias: 15, rotulo: "recurso especial/extraordinário" },
  { padrao: /(manifest\w*\s+sobre|sobre\s+os?\s+documentos?|sobre\s+o\s+laudo)/i, tipo: "Manifestação sobre documentos/laudo", dias: 15, rotulo: "manifestação sobre documentos/laudo" },
  { padrao: /especifica\w*\s+(as\s+)?provas/i, tipo: "Especificação de provas", dias: 5, rotulo: "especificação de provas" },
  { padrao: /(alega[çc][õo]es\s+finais|memoriais)/i, tipo: "Alegações finais / memoriais", dias: 15, rotulo: "alegações finais / memoriais" },
  { padrao: /pagamento\s+volunt[áa]rio|art\.?\s*523/i, tipo: "Cumprimento de sentença — pagamento voluntário", dias: 15, rotulo: "cumprimento de sentença (pagamento voluntário)" },
];

// "no prazo de 5 (cinco) dias" | "prazo de 15 dias" | "no prazo legal"
function diasDoTexto(texto: string): number | null {
  const numeral = texto.match(/prazo\s+(?:comum\s+|sucessivo\s+)?de\s+(\d{1,3})\s*(?:\([^)]*\)\s*)?dias?/i);
  if (numeral) return Number(numeral[1]);

  const porExtenso = texto.match(/prazo\s+(?:comum\s+|sucessivo\s+)?de\s+([a-zç]+)\s+dias?/i);
  if (porExtenso) {
    const n = EXTENSO[porExtenso[1].toLowerCase()];
    if (n) return n;
  }
  return null;
}

export function sugerirPrazo(texto: string): SugestaoPrazo {
  const limpo = limparTexto(texto);
  const diasExplicito = diasDoTexto(limpo);

  for (const regra of REGRAS) {
    if (regra.padrao.test(limpo)) {
      const dias = diasExplicito ?? regra.dias;
      const origem =
        diasExplicito !== null
          ? `${dias} dias (do texto)`
          : `${dias} dias (padrão de ${regra.rotulo})`;
      return {
        tipoProvavel: regra.tipo,
        dias,
        explicacao: `Parece ${regra.rotulo} — ${origem}. Confira.`,
      };
    }
  }

  if (diasExplicito !== null) {
    return {
      tipoProvavel: null,
      dias: diasExplicito,
      explicacao: `O texto menciona prazo de ${diasExplicito} dias, mas não deu para identificar o tipo. Escolha.`,
    };
  }

  return {
    tipoProvavel: null,
    dias: null,
    explicacao: "Não deu para sugerir o tipo nem o prazo pelo texto. Escolha manualmente.",
  };
}

// Heurística grosseira: a publicação parece só informativa (sem prazo)?
// Usada para dar um aviso leve na triagem — nunca decide sozinha.
export function pareceSemPrazo(texto: string): boolean {
  const limpo = limparTexto(texto).toLowerCase();
  if (diasDoTexto(limpo) !== null) return false;
  return /(aguarde-se|arquive-se|ci[êe]ncia|nada a prover|homologo|transitad|int\.?\s*$)/i.test(
    limpo,
  );
}
