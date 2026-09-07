// Filtro da lista de clientes (tela /clientes). Puro e testável — a página
// carrega todos os clientes do escritório (dezenas, não milhares) e filtra aqui.
// Casa por nome, e-mail (acento-insensível, em qualquer parte) ou pelos dígitos
// do CPF/CNPJ.

import { normalizarTexto } from "@/lib/texto";

export type ClienteBuscavel = {
  nome: string;
  cpf_cnpj: string;
  email: string | null;
};

export function clienteCasaBusca(
  cliente: ClienteBuscavel,
  termo: string,
): boolean {
  const alvo = normalizarTexto(termo);
  if (!alvo) return true;

  if (normalizarTexto(cliente.nome).includes(alvo)) return true;
  if (cliente.email && normalizarTexto(cliente.email).includes(alvo)) return true;

  // Busca por documento: só os dígitos dos dois lados, a partir de 2 dígitos.
  const digitosBusca = termo.replace(/\D/g, "");
  if (
    digitosBusca.length >= 2 &&
    cliente.cpf_cnpj.replace(/\D/g, "").includes(digitosBusca)
  ) {
    return true;
  }

  return false;
}

export function filtrarClientes<T extends ClienteBuscavel>(
  clientes: T[],
  termo: string,
): T[] {
  if (!termo.trim()) return clientes;
  return clientes.filter((c) => clienteCasaBusca(c, termo));
}
