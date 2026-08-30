// Painel "Memória de cálculo" (§4.B.6 / TELAS.md). Server component sem estado.
// Usado na tela de novo prazo (prévia) e no detalhe da atividade.

import { formatarDataBR, nomeDoDiaDaSemana } from "@/lib/domain/datas";
import type { MemoriaCalculo } from "@/lib/domain/prazo";

const EVENTO_LABEL: Record<string, string> = {
  disponibilizacao_djen: "Disponibilização no DJEN",
  intimacao_pessoal: "Intimação pessoal",
  juntada: "Juntada",
  ciencia: "Ciência",
  outro: "Evento",
};

export function passosDaMemoria(m: MemoriaCalculo, eventoTipo: string): string[] {
  const evento = EVENTO_LABEL[eventoTipo] ?? "Evento";
  const passos: string[] = [];

  if (m.dia1 === m.dataInicial) {
    passos.push(
      `${evento} em ${formatarDataBR(m.dataInicial)} — contado como o dia 1 (Opção A: não se exclui o dia do começo).`,
    );
  } else {
    passos.push(
      `${evento} em ${formatarDataBR(m.dataInicial)}; como não é dia útil, o dia 1 passa a ser ${formatarDataBR(m.dia1)} (${nomeDoDiaDaSemana(m.dia1)}).`,
    );
  }

  passos.push(
    m.dobro
      ? `Contagem de ${m.nDias} dias úteis (prazo em dobro: ${m.nDiasInformado} × 2).`
      : `Contagem de ${m.nDias} dias úteis.`,
  );

  if (m.diasPulados.length > 0) {
    // Feriado e recesso são o que importa conferir — sempre visíveis.
    // Fins de semana são resumidos numa contagem.
    const feriadosERecessos = m.diasPulados.filter(
      (d) => d.motivo !== "fim de semana",
    );
    const qtdFimDeSemana = m.diasPulados.length - feriadosERecessos.length;
    const partes = feriadosERecessos
      .slice(0, 6)
      .map((d) => `${formatarDataBR(d.data)} (${d.motivo})`);
    if (feriadosERecessos.length > 6) {
      partes.push(`e mais ${feriadosERecessos.length - 6} feriado(s)/recesso`);
    }
    if (qtdFimDeSemana > 0) {
      partes.push(
        qtdFimDeSemana === 1
          ? "1 dia de fim de semana"
          : `${qtdFimDeSemana} dias de fim de semana`,
      );
    }
    passos.push(`Dias não úteis pulados no caminho: ${partes.join("; ")}.`);
  }

  passos.push(
    `Prazo fatal calculado = ${formatarDataBR(m.prazoFatalCalculado)} (${nomeDoDiaDaSemana(m.prazoFatalCalculado)}).`,
  );

  passos.push(
    m.prazoApertado
      ? `Prazo interno: ${m.nDias} − ${m.margem} dias de margem ≤ 0 → interno = ${formatarDataBR(m.prazoInternoCalculado)} e o prazo fica marcado como apertado.`
      : `Prazo interno = prazo fatal − ${m.margem} dias úteis = ${formatarDataBR(m.prazoInternoCalculado)} (${nomeDoDiaDaSemana(m.prazoInternoCalculado)}).`,
  );

  return passos;
}

export function MemoriaCalculoPainel({
  memoria,
  eventoTipo,
  prazoFatal,
  prazoInterno,
  prazoApertado,
  aviso,
  children,
}: {
  memoria: MemoriaCalculo;
  eventoTipo: string;
  prazoFatal: string;
  prazoInterno: string;
  prazoApertado: boolean;
  aviso?: string | null;
  // rodapé opcional (ex.: botão "Salvar prazo")
  children?: React.ReactNode;
}) {
  const passos = passosDaMemoria(memoria, eventoTipo);

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between bg-teal px-5 py-4">
        <h2 className="text-base font-semibold text-white">Memória de cálculo</h2>
        <span className="text-[11.5px] font-medium text-white/65">
          cálculo automático
        </span>
      </div>

      <div className="flex flex-col gap-4 p-5">
        <div className="grid gap-3.5 [grid-template-columns:1fr_1fr]">
          <div className="flex flex-col gap-1 rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-3.5">
            <span className="text-xs font-medium text-[#991B1B]">
              Prazo fatal
            </span>
            <span className="text-xl font-semibold tabular-nums text-[#DC2626]">
              {formatarDataBR(prazoFatal)}
            </span>
            <span className="text-[11.5px] text-[#B91C1C]">
              {nomeDoDiaDaSemana(prazoFatal)}
            </span>
          </div>
          <div className="flex flex-col gap-1 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] p-3.5">
            <span className="text-xs font-medium text-[#92400E]">
              Prazo interno
            </span>
            <span className="text-xl font-semibold tabular-nums text-[#D97706]">
              {formatarDataBR(prazoInterno)}
            </span>
            <span className="text-[11.5px] text-[#B45309]">
              {prazoApertado ? "prazo apertado" : nomeDoDiaDaSemana(prazoInterno)}
            </span>
          </div>
        </div>

        {aviso && (
          <div className="flex gap-2.5 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-3.5 py-3">
            <span className="font-bold text-[#B45309]">!</span>
            <span className="text-[12.5px] leading-relaxed text-[#92400E]">
              {aviso}
            </span>
          </div>
        )}

        <div className="flex flex-col gap-2 rounded-lg border border-tint-2 bg-fundo p-3.5">
          <span className="rotulo">Como chegamos nessas datas</span>
          {passos.map((texto, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full bg-[#CFE3DF] text-[11px] font-semibold text-teal">
                {i + 1}
              </span>
              <span className="text-[13px] leading-relaxed">{texto}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="rotulo">Base legal</span>
          <span className="text-[13px] leading-relaxed">
            Contagem em dias úteis (CPC art. 219). Opção A do escritório: a
            disponibilização no DJEN é o dia 1 da contagem — cerca de 2 dias
            úteis mais conservador que o CPC art. 224 §§2º–3º.
            {memoria.marcosCpc && (
              <>
                {" "}
                Marcos informativos: publicação (CPC) em{" "}
                {formatarDataBR(memoria.marcosCpc.publicacaoCpc)}, início da
                contagem em{" "}
                {formatarDataBR(memoria.marcosCpc.inicioContagemCpc)}, fatal pelo
                CPC estrito em{" "}
                {formatarDataBR(memoria.marcosCpc.prazoFatalCpcEstrito)}.
              </>
            )}
          </span>
        </div>

        {children && (
          <>
            <div className="h-px bg-tint-2" />
            {children}
          </>
        )}
      </div>
    </div>
  );
}
