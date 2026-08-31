import Link from "next/link";
import type { Route } from "next";
import { formatarDataBR } from "@/lib/domain/datas";
import type { ProcessoParaSelecao } from "@/lib/db/processos";
import type { TipoAtividadeCatalogo } from "@/lib/db/tipos-atividade";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { SelecaoProcesso } from "@/components/SelecaoProcesso";
import { CamposRecorrencia } from "@/components/CamposRecorrencia";
import { salvarMonitoramento } from "./acoes";

export function FormularioMonitoramento({
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
  data: string; // hoje, como default
  erro: string | null;
  hrefCriarPasta: string;
}) {
  return (
    <div className="grid items-start gap-5 [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))] max-w-[900px]">
      <form
        action={salvarMonitoramento}
        className="card flex flex-col gap-4 p-6"
      >
        <h2 className="titulo-secao">Dados do monitoramento</h2>

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
          <span className="rotulo">Tipo de monitoramento</span>
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

        <label className="flex flex-col gap-1.5">
          <span className="rotulo">Alvo do monitoramento</span>
          <input
            name="alvo"
            placeholder="Nº do processo, certidão, órgão, link…"
            className="campo"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="rotulo">Data da verificação</span>
          <input
            type="date"
            name="data"
            defaultValue={data}
            className="campo"
          />
          <span className="text-xs text-texto-secundario">
            Em branco = hoje. O monitoramento aparece na agenda só nesse dia.
          </span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="rotulo">Título (opcional)</span>
          <input
            name="titulo"
            placeholder="Em branco = nome do tipo"
            className="campo"
          />
        </label>

        <CamposRecorrencia rotuloData="o dia da verificação" />

        <div className="flex gap-3 pt-1">
          <BotaoEnviar>Salvar monitoramento</BotaoEnviar>
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
          O monitoramento aparece na agenda apenas no dia da verificação
          {data ? (
            <>
              {" "}
              (<strong>{formatarDataBR(data)}</strong>)
            </>
          ) : null}
          . Ao concluir, você registra o resultado e se encontrou mudança — se
          encontrar, a prioridade sobe.
        </p>
      </div>
    </div>
  );
}
