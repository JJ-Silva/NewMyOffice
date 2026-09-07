// Filtro puro do ComboBox — separado do componente pra ser testável.

import { normalizarTexto } from "./texto";

export type OpcaoComboBox = { value: string; label: string; sub?: string };

// Acento-insensível, casa em qualquer parte do label. Texto vazio → tudo.
export function filtrarOpcoes(
  opcoes: OpcaoComboBox[],
  texto: string,
): OpcaoComboBox[] {
  const q = normalizarTexto(texto);
  if (!q) return opcoes;
  return opcoes.filter((o) => normalizarTexto(o.label).includes(q));
}
