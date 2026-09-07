// Normaliza texto para comparação de busca: sem acento, minúsculo, sem espaço
// nas pontas. Usado por filtros client-side (ComboBox, lista de clientes).

export function normalizarTexto(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}
