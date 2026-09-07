// Filtro puro do ComboBox — separado do componente pra ser testável.

export type OpcaoComboBox = { value: string; label: string; sub?: string };

function normaliza(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "") // tira acentos
    .toLowerCase()
    .trim();
}

// Acento-insensível, casa em qualquer parte do label. Texto vazio → tudo.
export function filtrarOpcoes(
  opcoes: OpcaoComboBox[],
  texto: string,
): OpcaoComboBox[] {
  const q = normaliza(texto);
  if (!q) return opcoes;
  return opcoes.filter((o) => normaliza(o.label).includes(q));
}
