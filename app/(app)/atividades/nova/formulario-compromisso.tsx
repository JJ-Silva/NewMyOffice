import Link from "next/link";
import type { Route } from "next";
import { somarDias, formatarDataBR } from "@/lib/domain/datas";
import { REGRAS_TIPO } from "@/lib/domain/atividade";
import type { ProcessoParaSelecao } from "@/lib/db/processos";
import type { TipoAtividadeCatalogo } from "@/lib/db/tipos-atividade";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { SelecaoProcesso } from "@/components/SelecaoProcesso";
import { CamposRecorrencia } from "@/components/CamposRecorrencia";
import { salvarCompromisso } from "./acoes";

export function FormularioCompromisso({
  processos,
  tipos,
  processoSelecionado,
  data,
  erro,
  hrefCriarPasta,
}: {
  processos: ProcessoParaSelecao[];
  tipos: TipoAtividadeCatalogo[];
  processoSelecionado: string;
  data: string;
  erro: string | null;
  hrefCriarPasta: string;
}) {
  const diasAntes = REGRAS_TIPO.compromisso.diasAntesVisivelPadrao;

  return (
    <div className="grid items-start gap-5 [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))] max-w-[900px]">
      <form action={salvarCompromisso} className="card flex flex-col gap-4 p-6">
        <h2 className="titulo-secao">Dados do compromisso</h2>

        {erro && (
          <p className="rounded-lg border border-atrasado bg-[var(--atrasado-fundo)] px-3 py-2 text-sm text-atrasado">
            {erro}
          </p>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="flex items-center justify-between">
            <span className="rotulo">Processo</span>
            <Link
              href={hrefCriarPasta as Route}
              className="text-xs font-medium text-teal hover:underline"
            >
              + nova pasta
            </Link>
          </span>
          <SelecaoProcesso
            processos={processos}
            value={processoSelecionado}
          />
          <span className="text-xs text-texto-secundario">
            O “geral da pasta” é o trabalho da pasta sem processo formal.
          </span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="rotulo">Tipo de compromisso</span>
          <select name="tipo" required className="campo" defaultValue="">
            <option value="" disabled>
              Selecione o tipo…
            </option>
            {tipos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-4 [grid-template-columns:1fr_120px_120px]">
          <label className="flex flex-col gap-1.5">
            <span className="rotulo">Data</span>
            <input
              type="date"
              name="data"
              required
              defaultValue={data}
              className="campo"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="rotulo">Horário</span>
            <input type="time" name="hora" className="campo" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="rotulo">Duração (min)</span>
            <input type="number" name="duracao" min={1} className="campo" />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="rotulo">Local</span>
          <input
            name="local"
            placeholder="Ex.: Fórum de Sorocaba — sala 4"
            className="campo"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="rotulo">Título (opcional)</span>
          <input
            name="titulo"
            placeholder="Em branco = nome do tipo"
            className="campo"
          />
        </label>

        <CamposRecorrencia rotuloData="a data do compromisso" />

        <div className="flex gap-3 pt-1">
          <BotaoEnviar>Salvar compromisso</BotaoEnviar>
          <Link
            href="/agenda"
            className="flex h-10 items-center rounded-lg border border-tint-3 bg-white px-4 text-sm font-medium"
          >
            Cancelar
          </Link>
        </div>
      </form>

      <div className="card flex flex-col gap-3 p-6">
        <h2 className="titulo-secao">Prévia da agenda</h2>
        <p className="text-[13px] leading-relaxed text-texto-secundario">
          Compromissos e monitoramentos não têm memória de cálculo: a data é
          definida por você, não apurada em dias úteis.
        </p>
        {data && (
          <div className="rounded-lg border border-tint-2 bg-fundo p-3.5 text-[13px]">
            Aparece na agenda a partir de{" "}
            <strong>{formatarDataBR(somarDias(data, -diasAntes))}</strong> (
            {diasAntes} dias antes) e some depois de{" "}
            <strong>{formatarDataBR(data)}</strong>.
          </div>
        )}
      </div>
    </div>
  );
}
