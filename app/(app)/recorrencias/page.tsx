import Link from "next/link";
import { exigirSessao } from "@/lib/supabase/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { hojeNoBrasil } from "@/lib/hoje";
import { formatarDataBR, nomeDoDiaDaSemana } from "@/lib/domain/datas";
import { listarRecorrencias } from "@/lib/db/recorrencias";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { encerrarRecorrenciaAction, excluirRecorrenciaAction } from "./acoes";

const TIPO_LABEL = {
  compromisso: "Compromisso",
  monitoramento: "Monitoramento",
} as const;

export default async function PaginaRecorrencias({
  searchParams,
}: PageProps<"/recorrencias">) {
  const sessao = await exigirSessao();
  const supabase = await criarClienteServidor();
  const params = await searchParams;
  const hoje = hojeNoBrasil();

  const criada = params.criada === "1";
  const erro = typeof params.erro === "string" ? params.erro : null;

  const recorrencias = await listarRecorrencias(
    supabase,
    sessao.escritorioId,
    hoje,
  );
  const ativas = recorrencias.filter((r) => r.ativa);
  const encerradas = recorrencias.filter((r) => !r.ativa);

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex items-end justify-between gap-5">
        <div className="flex flex-col gap-1.5">
          <h1 className="titulo-pagina">Recorrências</h1>
          <p className="subtitulo-pagina">
            Compromissos e monitoramentos que se repetem. As instâncias entram
            na agenda automaticamente. Prazo nunca recorre.
          </p>
        </div>
        <Link href="/atividades/nova" className="botao-primario flex-none">
          + Nova atividade
        </Link>
      </div>

      {criada && (
        <div className="rounded-lg border border-cumprido bg-[#F0FDF4] px-3.5 py-2.5 text-sm text-[#166534]">
          Recorrência criada. A primeira ocorrência já está na agenda; as
          próximas aparecem no momento certo.
        </div>
      )}
      {erro && (
        <p className="rounded-lg border border-atrasado bg-[var(--atrasado-fundo)] px-3 py-2 text-sm text-atrasado">
          {erro}
        </p>
      )}

      {recorrencias.length === 0 ? (
        <div className="painel-vazio">
          Nenhuma recorrência. Ao lançar um compromisso ou monitoramento, marque
          “Repetir esta atividade”.
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <Secao titulo={`Ativas (${ativas.length})`}>
            {ativas.length === 0 ? (
              <p className="text-[13px] text-texto-secundario">
                Nenhuma recorrência ativa.
              </p>
            ) : (
              ativas.map((r) => <Cartao key={r.id} r={r} />)
            )}
          </Secao>

          {encerradas.length > 0 && (
            <Secao titulo={`Encerradas (${encerradas.length})`}>
              {encerradas.map((r) => (
                <Cartao key={r.id} r={r} />
              ))}
            </Secao>
          )}
        </div>
      )}
    </div>
  );
}

function Secao({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="titulo-secao">{titulo}</h2>
      {children}
    </section>
  );
}

function Cartao({
  r,
}: {
  r: Awaited<ReturnType<typeof listarRecorrencias>>[number];
}) {
  return (
    <div
      className="card flex flex-col gap-3 p-4"
      style={{ opacity: r.ativa ? 1 : 0.6 }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm font-semibold">
            ↻ {r.titulo ?? r.tipoAtividadeNome ?? "atividade"}
            <span className="ml-2 text-xs font-normal text-texto-secundario">
              {TIPO_LABEL[r.atividadeTipo]}
            </span>
          </span>
          <span className="text-xs text-texto-secundario">
            {r.pastaNome ?? r.pastaCodigo}
            {r.pastaNome ? ` · ${r.pastaCodigo}` : ""} ·{" "}
            {r.clienteNome ?? "sem cliente"} · {r.responsavelNome ?? "sem responsável"}
          </span>
        </div>
        <span className="rounded-md bg-fundo px-2 py-1 text-xs font-medium text-teal">
          {r.descricaoRegra}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] text-texto-secundario">
        <span>
          Próxima:{" "}
          {r.proximaData ? (
            <strong className="text-texto">
              {formatarDataBR(r.proximaData)} ({nomeDoDiaDaSemana(r.proximaData)})
            </strong>
          ) : (
            "—"
          )}
        </span>
        <span>
          {r.qtdInstancias} instância{r.qtdInstancias === 1 ? "" : "s"} ·{" "}
          {r.qtdPendentes} em aberto
        </span>
      </div>

      {r.ativa ? (
        <div className="flex flex-wrap items-center gap-3 border-t border-tint-1 pt-3">
          <form action={encerrarRecorrenciaAction}>
            <input type="hidden" name="id" value={r.id} />
            <BotaoEnviar className="botao-secundario" rotuloOcupado="…">
              Encerrar
            </BotaoEnviar>
          </form>
          <span className="text-xs text-texto-secundario">
            Para de gerar novas. As ocorrências futuras ainda não feitas são
            removidas; o histórico fica.
          </span>

          <details className="w-full text-sm">
            <summary className="cursor-pointer text-texto-secundario">
              Excluir (criada errada)
            </summary>
            <form
              action={excluirRecorrenciaAction}
              className="mt-2 flex items-end gap-2"
            >
              <input type="hidden" name="id" value={r.id} />
              <label className="flex flex-col gap-1.5">
                <span className="rotulo">
                  Remove a régua e as pendentes de hoje em diante. Digite{" "}
                  <strong>EXCLUIR</strong>.
                </span>
                <input
                  name="confirmacao"
                  required
                  placeholder="EXCLUIR"
                  className="campo w-[220px]"
                />
              </label>
              <BotaoEnviar className="botao-perigo h-[38px]" rotuloOcupado="…">
                Excluir
              </BotaoEnviar>
            </form>
          </details>
        </div>
      ) : (
        <span className="border-t border-tint-1 pt-3 text-xs text-texto-secundario">
          Encerrada — não gera mais instâncias.
        </span>
      )}
    </div>
  );
}
