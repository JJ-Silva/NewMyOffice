import Link from "next/link";
import type { Route } from "next";
import {
  exigirSessao,
  exigirPermissao,
  sessaoPode,
} from "@/lib/supabase/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { hojeNoBrasil } from "@/lib/hoje";
import {
  formatarDataBR,
  nomeDoDiaDaSemana,
  compararDatas,
} from "@/lib/domain/datas";
import {
  estadoNaAgenda,
  prioridadeEfetiva,
  atividadeVisivelEm,
  type EstadoAgenda,
} from "@/lib/domain/atividade";
import { listarAgenda, type ItemAgenda } from "@/lib/db/agenda";
import { listarPastas } from "@/lib/db/pastas";
import { materializarRecorrenciasDoEscritorio } from "@/lib/db/recorrencias";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { concluir } from "./acoes";

const COR_ESTADO: Record<EstadoAgenda, string> = {
  atrasada: "#DC2626",
  vence_hoje: "#F5C400",
  hora_de_fazer: "#D97706",
  futura: "#B9D4D3",
  concluida: "#16A34A",
  cancelada: "#9AA0A6",
};

const TIPO_LABEL: Record<ItemAgenda["tipo"], string> = {
  prazo: "Prazo",
  compromisso: "Compromisso",
  monitoramento: "Monitoramento",
};

const STATUS_OPCOES = [
  { valor: "", label: "Em aberto" },
  { valor: "pendente", label: "Pendente" },
  { valor: "em_andamento", label: "Em andamento" },
  { valor: "concluida", label: "Concluída" },
  { valor: "cancelada", label: "Cancelada" },
];

const TIPO_OPCOES = [
  { valor: "", label: "Todos os tipos" },
  { valor: "prazo", label: "Prazo" },
  { valor: "compromisso", label: "Compromisso" },
  { valor: "monitoramento", label: "Monitoramento" },
];

function diasDeDiferenca(de: string, ate: string): number {
  return Math.round(compararDatas(ate, de) / 86_400_000);
}

function rotulo(item: ItemAgenda, hoje: string) {
  const estado = estadoNaAgenda(
    { status: item.status, data: item.data, prazoInterno: item.prazoInterno },
    hoje,
  );
  const cor = COR_ESTADO[estado];
  let sub = `${nomeDoDiaDaSemana(item.data)}`;
  if (estado === "atrasada") {
    const d = diasDeDiferenca(item.data, hoje);
    sub = d === 1 ? "atrasado há 1 dia" : `atrasado há ${d} dias`;
  } else if (estado === "vence_hoje") {
    sub = "vence hoje";
  } else if (estado === "hora_de_fazer") {
    sub = "hora de fazer";
  } else if (estado === "concluida") {
    sub = "concluída";
  } else if (estado === "cancelada") {
    sub = "cancelada";
  }
  return { estado, cor, sub };
}

export default async function PaginaAgenda({
  searchParams,
}: PageProps<"/agenda">) {
  const sessao = await exigirSessao();
  exigirPermissao(sessao, "atividades.ver");
  const podeLancarAtividade = sessaoPode(sessao, "atividades.criar");
  const supabase = await criarClienteServidor();
  const params = await searchParams;
  const hoje = hojeNoBrasil();

  const fPasta = typeof params.pasta === "string" ? params.pasta : "";
  const fStatus = typeof params.status === "string" ? params.status : "";
  const fTipo = typeof params.tipo === "string" ? params.tipo : "";
  const verTudo = params.tudo === "1";
  const lancado = params.lancado === "1";
  const temFiltro = Boolean(fPasta || fStatus || fTipo || verTudo);

  // Janela rolante das recorrências (Etapa 3a): materializa as instâncias
  // futuras que faltam antes de montar a lista. É uma escrita no carregamento
  // da agenda — aceitável aqui: a página já é dinâmica (sessão + filtros) e no
  // caso comum não há nada a criar, só leituras.
  await materializarRecorrenciasDoEscritorio(supabase, sessao.escritorioId, hoje);

  const [pastas, itensBrutos] = await Promise.all([
    listarPastas(supabase, sessao.escritorioId),
    listarAgenda(supabase, sessao.escritorioId, {
      pastaId: fPasta || undefined,
      status: (fStatus as "" | undefined) || undefined,
      tipo: (fTipo as "" | undefined) || undefined,
    }),
  ]);

  // Sem filtro de status: esconde concluídas/canceladas.
  let itens = fStatus
    ? itensBrutos
    : itensBrutos.filter(
        (i) => i.status !== "concluida" && i.status !== "cancelada",
      );

  // Visibilidade por tipo (§3.6): prazo sempre; compromisso 5 dias antes;
  // monitoramento no dia. O toggle "ver tudo" e o filtro de status ignoram isso.
  if (!verTudo && !fStatus) {
    itens = itens.filter((i) =>
      atividadeVisivelEm(
        {
          tipo: i.tipo,
          status: i.status,
          data: i.data,
          diasAntesVisivelCustom: i.diasAntesVisivelCustom,
        },
        hoje,
      ),
    );
  }

  const atrasados = itens.filter(
    (i) =>
      i.status !== "concluida" &&
      i.status !== "cancelada" &&
      compararDatas(i.data, hoje) < 0,
  ).length;

  const paramsAtuais = new URLSearchParams();
  if (fPasta) paramsAtuais.set("pasta", fPasta);
  if (fStatus) paramsAtuais.set("status", fStatus);
  if (fTipo) paramsAtuais.set("tipo", fTipo);
  const hrefVerTudo = (`/agenda?${paramsAtuais.toString()}${
    paramsAtuais.toString() ? "&" : ""
  }tudo=1` as unknown) as Route;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-5">
        <div className="flex flex-col gap-1.5">
          <h1 className="titulo-pagina">Agenda de atividades</h1>
          <p className="subtitulo-pagina">
            {formatarDataBR(hoje)} ({nomeDoDiaDaSemana(hoje)}) ·{" "}
            {itens.length} atividade{itens.length === 1 ? "" : "s"}
            {atrasados > 0
              ? ` · ${atrasados} atrasada${atrasados === 1 ? "" : "s"}`
              : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="abas">
            <Link href="/agenda" className="aba" data-ativa={true}>
              Lista
            </Link>
            <Link
              href="/agenda/calendario"
              className="aba"
              data-ativa={false}
            >
              Calendário
            </Link>
          </div>
          {podeLancarAtividade && (
            <Link href="/atividades/nova" className="botao-primario flex-none">
              + Nova atividade
            </Link>
          )}
        </div>
      </div>

      {lancado && (
        <div className="rounded-lg border border-cumprido bg-[#F0FDF4] px-3.5 py-2.5 text-sm text-[#166534]">
          Atividade lançada. Ela aparece na agenda no momento certo do tipo.
        </div>
      )}

      {/* Filtros (GET) */}
      <form
        method="get"
        action="/agenda"
        className="card flex flex-wrap items-end gap-3 p-4"
      >
        <label className="flex min-w-[200px] flex-1 flex-col gap-1.5">
          <span className="rotulo">Pasta</span>
          <select name="pasta" defaultValue={fPasta} className="campo">
            <option value="">Todas as pastas</option>
            {pastas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome ?? p.codigo}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[150px] flex-col gap-1.5">
          <span className="rotulo">Tipo</span>
          <select name="tipo" defaultValue={fTipo} className="campo">
            {TIPO_OPCOES.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[150px] flex-col gap-1.5">
          <span className="rotulo">Status</span>
          <select name="status" defaultValue={fStatus} className="campo">
            {STATUS_OPCOES.map((s) => (
              <option key={s.valor} value={s.valor}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        {verTudo && <input type="hidden" name="tudo" value="1" />}
        <button type="submit" className="botao-primario h-[38px]">
          Filtrar
        </button>
        {!verTudo && !fStatus && (
          <Link href={hrefVerTudo} className="link-acao pb-2.5">
            Ver tudo
          </Link>
        )}
        {temFiltro && (
          <Link href="/agenda" className="link-acao pb-2.5">
            Limpar
          </Link>
        )}
      </form>

      {itens.length === 0 ? (
        <div className="painel-vazio">
          Nenhuma atividade na agenda. Lance uma em “+ Nova atividade”.
        </div>
      ) : (
        <div className="flex flex-col gap-2 overflow-x-auto pb-1">
          <div className="grid min-w-[880px] gap-4 px-[18px] pb-0.5 [grid-template-columns:minmax(200px,1.4fr)_minmax(160px,1fr)_minmax(120px,150px)_120px]">
            <span className="rotulo">Caso</span>
            <span className="rotulo">Atividade</span>
            <span className="rotulo">Quando</span>
            <span className="rotulo text-center">Ação</span>
          </div>

          {itens.map((item) => {
            const r = rotulo(item, hoje);
            const prioridade = prioridadeEfetiva(
              { data: item.data, prioridadeManual: item.prioridadeManual },
              hoje,
            );
            const esmaecida =
              item.status === "concluida" || item.status === "cancelada";
            return (
              <div
                key={item.id}
                className="card grid min-w-[880px] items-center gap-4 px-[18px] py-3 [grid-template-columns:minmax(200px,1.4fr)_minmax(160px,1fr)_minmax(120px,150px)_120px]"
                style={{
                  borderLeft: `4px solid ${r.cor}`,
                  opacity: esmaecida ? 0.6 : 1,
                }}
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  {/* 1 · nome do caso */}
                  <Link
                    href={`/agenda/${item.id}`}
                    className="truncate text-sm font-semibold text-texto hover:text-teal hover:no-underline"
                  >
                    {item.pastaNome ?? item.pastaCodigo}
                  </Link>
                  {/* 2 · número do processo */}
                  <span className="truncate text-xs tabular-nums text-texto-secundario">
                    {item.processoTipo !== "geral" && "⚖ "}
                    {item.processoNumero ?? item.pastaCodigo}
                  </span>
                  {/* 3 · nome da parte */}
                  <span className="truncate text-[11px] text-texto-secundario">
                    {item.clienteNome ?? "sem cliente"}
                  </span>
                </div>

                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-[13.5px]">
                    {item.recorrente && (
                      <span title="Instância de uma recorrência">↻ </span>
                    )}
                    {item.titulo ?? item.tipoAtividadeNome ?? "atividade"}
                  </span>
                  <span className="text-xs text-texto-secundario">
                    {TIPO_LABEL[item.tipo]}
                    {item.titulo && item.tipoAtividadeNome
                      ? ` · ${item.tipoAtividadeNome}`
                      : ""}{" "}
                    · {item.responsavelNome ?? "—"}
                  </span>
                </div>

                <div className="flex min-w-0 flex-col gap-0.5">
                  <span
                    className="text-sm font-semibold tabular-nums"
                    style={{
                      color: r.cor === "#B9D4D3" ? "var(--texto)" : r.cor,
                    }}
                  >
                    {formatarDataBR(item.data)}
                  </span>
                  <span className="text-[11.5px] text-texto-secundario">
                    {r.sub}
                    {item.prazoApertado ? " · apertado" : ""}
                    {(prioridade === "urgente" || prioridade === "alta") &&
                    !esmaecida
                      ? ` · ${prioridade}`
                      : ""}
                  </span>
                </div>

                <div className="flex justify-center">
                  {esmaecida ? (
                    <Link
                      href={`/agenda/${item.id}`}
                      className="text-xs text-texto-secundario hover:text-teal"
                    >
                      ver
                    </Link>
                  ) : (
                    <form action={concluir}>
                      <input type="hidden" name="id" value={item.id} />
                      <BotaoEnviar className="botao-concluir" rotuloOcupado="…">
                        ✓ Concluir
                      </BotaoEnviar>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
