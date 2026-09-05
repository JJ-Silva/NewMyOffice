import { BuscaSeletor } from "./BuscaSeletor";

// O seletor de processo de atividades/nova (as 3 abas). Só fixa o endpoint e os
// textos; toda a mecânica (modal, busca, teclado) está em BuscaSeletor.
export function SeletorProcesso({
  value = "",
  rotuloInicial = null,
}: {
  value?: string;
  rotuloInicial?: string | null;
}) {
  return (
    <BuscaSeletor
      name="processo_id"
      endpoint="/api/busca/processos"
      valorInicial={value}
      rotuloInicial={rotuloInicial}
      textoVazio="Selecione o processo…"
      tituloModal="Buscar processo"
      placeholder="Número, pasta, cliente ou parte…"
      required
    />
  );
}
