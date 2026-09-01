// CPF / CNPJ — regra de armazenamento e exibição.
//
// Decisão: guardamos SÓ OS DÍGITOS (forma canônica). A pontuação é enfeite de
// tela. Assim "274.488.578-94", "27448857894" e "274 488 578-94" viram a mesma
// coisa e o índice único (escritorio_id, cpf_cnpj) impede duplicata.
//
// TypeScript puro, sem dependências.

export function apenasDigitos(valor: string | null | undefined): string {
  return (valor ?? "").replace(/\D/g, "");
}

// Para GRAVAR: só os dígitos. Se o texto não tem nenhum dígito (ex.: um
// placeholder tipo "(sem doc) Fulano"), devolve o texto original aparado —
// não é um documento, é uma anotação.
export function normalizarCpfCnpj(valor: string | null | undefined): string {
  const digitos = apenasDigitos(valor);
  return digitos.length > 0 ? digitos : (valor ?? "").trim();
}

// Para EXIBIR: 11 dígitos → CPF, 14 → CNPJ. Qualquer outra coisa volta como veio.
export function formatarCpfCnpj(valor: string | null | undefined): string {
  const d = apenasDigitos(valor);
  if (d.length === 11) {
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }
  if (d.length === 14) {
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  }
  return (valor ?? "").trim();
}

// Tem a cara de um documento? (11 ou 14 dígitos). Não confere dígito verificador.
export function pareceCpfCnpj(valor: string | null | undefined): boolean {
  const n = apenasDigitos(valor).length;
  return n === 11 || n === 14;
}
