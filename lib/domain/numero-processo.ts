// O que o usuário digitou no campo "número do processo" de um processo JUDICIAL,
// já interpretado: é um CNJ (Res. CNJ 65/2008) ou um número livre (REsp, RE,
// AREsp, número antigo…)? Qual é o tribunal?
//
// Regra de negócio, num lugar só (antes estava copiada nas duas Server Actions
// de salvar processo):
//   1. campo vazio                     → erro
//   2. é CNJ                           → o tribunal vem do PRÓPRIO número;
//                                        o dígito verificador é conferido mas
//                                        NÃO bloqueia (a UI avisa) — plano §1.1
//   3. não é CNJ                       → vale o tribunal escolhido na lista;
//                                        sem tribunal válido → erro
//
// TypeScript puro, testável. Sem Supabase, sem React.

import { analisarCnj, type CnjPartes, type Justica } from "./cnj";
import { tribunalPorCodigo, identificarTribunal } from "./tribunais-cnj";

// Tudo que a camada de dados precisa gravar sobre o número de um processo
// judicial. `tribunalCodigo` (= segmento*100 + tribunal) ainda é resolvido para
// o `tribunal_id` do escritório na Server Action (isso é I/O).
export type NumeroJudicial = {
  numero: string; // canônico: o CNJ formatado, ou o texto livre já aparado
  cnjFormatado: string | null;
  cnjPartes: CnjPartes | null;
  digitoConfere: boolean | null;
  justica: Justica | null;
  tribunalCodigo: number;
};

export function interpretarNumeroProcesso(
  digitado: string,
  tribunalEscolhido: number | null,
):
  | { ok: true; numero: NumeroJudicial }
  | { ok: false; erro: string } {
  const texto = (digitado ?? "").trim();
  if (!texto) {
    return { ok: false, erro: "Informe o número do processo." };
  }

  const analise = analisarCnj(texto);

  // ── É um CNJ: o número manda no tribunal ────────────────────────────────
  if (analise.ok) {
    const cnj = analise.cnj;
    const doNumero = identificarTribunal(cnj.partes);
    // combinação segmento/tribunal fora do catálogo (raríssimo) → cai no
    // tribunal escolhido na lista, se houver um válido
    const codigo = doNumero?.codigo ?? tribunalValido(tribunalEscolhido);
    if (codigo === null) {
      return {
        ok: false,
        erro: "Não reconheci o tribunal pelo número. Escolha na lista.",
      };
    }
    return {
      ok: true,
      numero: {
        numero: cnj.formatado,
        cnjFormatado: cnj.formatado,
        cnjPartes: cnj.partes,
        digitoConfere: cnj.digitoConfere,
        justica: cnj.justica,
        tribunalCodigo: codigo,
      },
    };
  }

  // ── Número livre (REsp, RE, número antigo…): precisa do tribunal da lista ─
  const codigo = tribunalValido(tribunalEscolhido);
  if (codigo === null) {
    return { ok: false, erro: "Escolha o tribunal." };
  }
  return {
    ok: true,
    numero: {
      numero: texto,
      cnjFormatado: null,
      cnjPartes: null,
      digitoConfere: null,
      justica: null,
      tribunalCodigo: codigo,
    },
  };
}

// Devolve o código só se for um tribunal conhecido; senão null.
function tribunalValido(codigo: number | null): number | null {
  if (codigo === null || !Number.isInteger(codigo)) return null;
  return tribunalPorCodigo(codigo) ? codigo : null;
}
