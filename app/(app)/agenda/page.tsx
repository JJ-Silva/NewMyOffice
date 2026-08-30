import Link from "next/link";
import { exigirSessao } from "@/lib/supabase/sessao";
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
  type EstadoAgenda,
} from "@/lib/domain/atividade";
import { listarAgenda, type ItemAgenda } from "@/lib/db/agenda";
import { listarPastas } from "@/lib/db/pastas";
import { concluir } from "./acoes";

const COR_ESTADO: Record<EstadoAgenda, string> = {
  atrasada: "#DC2626",
  vence_hoje: "#F5C400",
  hora_de_fazer: "#D97706",
  futura: "#B9D4D3",
  concluida: "#16A34A",
  cancelada: "#9AA0A6",
};

const STATUS_OPCOES = [
  { valor: "", label: "Em aberto" },
  { valor: "pendente", label: "Pendente" },
  { valor: "em_andamento", label: "Em andamento" },
  { valor: "concluida", label: "Concluída" },
  { valor: "cancelada", label: "Cancelada" },
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
  const supabase = await criarClienteServidor();
  const params = await searchParams;
  const hoje = hojeNoBrasil();

  const fPasta = typeof params.pasta === "string" ? params.pasta : "";
  const fStatus = typeof params.status === "string" ? params.status : "";
  const lancado = params.lancado === "1";

  const [pastas, itensBrutos] = await Promise.all([
    listarPastas(supabase, sessao.escritorioId),
    listarAgenda(supabase, sessao.escritorioId, {
      pastaId: fPasta || undefined,
      status: (fStatus as "" | undefined) || undefined,
    }),
  ]);

  // Sem filtro de status: esconde concluídas/canceladas (comportamento padrão da agenda).
  const itens = fStatus
    ? itensBrutos
    : itensBrutos.filter(
        (i) => i.status !== "concluida" && i.status !== "cancelada",
      );

  const atrasados = itens.filter(
    (i) =>
      i.status !== "concluida" &&
      i.status !== "cancelada" &&
      compararDatas(i.data, hoje) < 0,
  ).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-5">
        <div className="flex flex-col gap-1.5">
          <h1 className="titulo-pagina">Agenda de atividades</h1>
          <p className="subtitulo-pagina">
            {formatarDataBR(hoje)} ({nomeDoDiaDaSemana(hoje)}) ·{" "}
            {itens.length} atividade{itens.length === 1 ? "" : "s"}
            {atrasados > 0 ? ` · ${atrasados} atrasada${atrasados === 1 ? "" : "s"}` : ""}
          </p>
        </div>
        <Link href="/atividades/nova" className="botao-primario flex-none">
          + Novo prazo
        </Link>
      </div>

      {lancado && (
        <div className="rounded-lg border border-cumprido bg-[#F0FDF4] px-3.5 py-2.5 text-sm text-[#166534]">
          Prazo lançado. Ele aparece abaixo, ordenado pela data de vencimento.
        </div>
      )}

      {/* Filtros (GET) */}
      <form
        method="get"
        action="/agenda"
        className="card flex flex-wrap items-end gap-3 p-4"
      >
        <label className="flex min-w-[220px] flex-1 flex-col gap-1.5">
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
        <label className="flex min-w-[160px] flex-col gap-1.5">
          <span className="rotulo">Status</span>
          <select name="status" defaultValue={fStatus} className="campo">
            {STATUS_OPCOES.map((s) => (
              <option key={s.valor} value={s.valor}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="botao-primario h-[38px]">
          Filtrar
        </button>
        {(fPasta || fStatus) && (
          <Link href="/agenda" className="link-acao pb-2.5">
            Limpar
          </Link>
        )}
      </form>

      {itens.length === 0 ? (
        <div className="painel-vazio">
          Nenhuma atividade na agenda. Lance um prazo em “+ Novo prazo”.
        </div>
      ) : (
        <div className="flex flex-col gap-2 overflow-x-auto pb-1">
          <div className="grid min-w-[860px] gap-4 px-[18px] pb-0.5 [grid-template-columns:minmax(200px,1.4fr)_minmax(160px,1fr)_minmax(120px,150px)_120px]">
            <span className="rotulo">Pasta / cliente</span>
            <span className="rotulo">Prazo</span>
            <span className="rotulo">Vencimento</span>
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
                className="card grid min-w-[860px] items-center gap-4 px-[18px] py-3 [grid-template-columns:minmax(200px,1.4fr)_minmax(160px,1fr)_minmax(120px,150px)_120px]"
                style={{
                  borderLeft: `4px solid ${r.cor}`,
                  opacity: esmaecida ? 0.6 : 1,
                }}
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <Link
                    href={`/agenda/${item.id}`}
                    className="truncate text-sm font-semibold text-texto hover:text-teal hover:no-underline"
                  >
                    {item.pastaNome ?? item.pastaCodigo}
                  </Link>
                  <span className="truncate text-xs text-texto-secundario">
                    {item.pastaNome ? `${item.pastaCodigo} · ` : ""}
                    {item.clienteNome ?? "sem cliente"}
                  </span>
                </div>

                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-[13.5px]">
                    {item.tipoAtividadeNome ?? item.titulo}
                  </span>
                  <span className="text-xs text-texto-secundario">
                    {item.responsavelNome ?? "sem responsável"}
                  </span>
                </div>

                <div className="flex min-w-0 flex-col gap-0.5">
                  <span
                    className="text-sm font-semibold tabular-nums"
                    style={{ color: r.cor === "#B9D4D3" ? "var(--texto)" : r.cor }}
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
                  {item.status === "concluida" ||
                  item.status === "cancelada" ? (
                    <Link
                      href={`/agenda/${item.id}`}
                      className="text-xs text-texto-secundario hover:text-teal"
                    >
                      ver
                    </Link>
                  ) : (
                    <form action={concluir}>
                      <input type="hidden" name="id" value={item.id} />
                      <button type="submit" className="botao-concluir">
                        ✓ Concluir
                      </button>
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
