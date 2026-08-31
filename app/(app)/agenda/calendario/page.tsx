import Link from "next/link";
import type { Route } from "next";
import { exigirSessao, exigirPermissao } from "@/lib/supabase/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { hojeNoBrasil } from "@/lib/hoje";
import {
  formatarDataBR,
  formatarMesAno,
  partesDaData,
  nomeDoDiaDaSemana,
  somarDias,
} from "@/lib/domain/datas";
import {
  semanasDoMes,
  semanaDe,
  mesAnterior,
  mesSeguinte,
  mesDaData,
  ehDoMes,
} from "@/lib/domain/grade-calendario";
import { listarAgenda, type ItemAgenda } from "@/lib/db/agenda";
import { listarPastas } from "@/lib/db/pastas";
import { materializarRecorrenciasDoEscritorio } from "@/lib/db/recorrencias";

const COR_TIPO: Record<ItemAgenda["tipo"], string> = {
  prazo: "#00727E",
  compromisso: "#D97706",
  monitoramento: "#736769",
};
const TIPO_LABEL: Record<ItemAgenda["tipo"], string> = {
  prazo: "Prazo",
  compromisso: "Compromisso",
  monitoramento: "Monitoramento",
};
const CABECALHO_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const TIPO_OPCOES = [
  { valor: "", label: "Todos os tipos" },
  { valor: "prazo", label: "Prazo" },
  { valor: "compromisso", label: "Compromisso" },
  { valor: "monitoramento", label: "Monitoramento" },
];

export default async function PaginaCalendario({
  searchParams,
}: PageProps<"/agenda/calendario">) {
  const sessao = await exigirSessao();
  exigirPermissao(sessao, "atividades.ver");
  const supabase = await criarClienteServidor();
  const params = await searchParams;
  const hoje = hojeNoBrasil();

  const vista = params.vista === "semana" ? "semana" : "mes";
  const fPasta = typeof params.pasta === "string" ? params.pasta : "";
  const fTipo = typeof params.tipo === "string" ? params.tipo : "";
  const verConcluidas = params.concluidas === "1";

  // Mês/semana de referência (default: os de hoje).
  const mesRef =
    typeof params.mes === "string" && /^\d{4}-\d{2}$/.test(params.mes)
      ? params.mes
      : mesDaData(hoje);
  const diaRef =
    typeof params.dia === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.dia)
      ? params.dia
      : hoje;

  await materializarRecorrenciasDoEscritorio(supabase, sessao.escritorioId, hoje);

  const [pastas, itens] = await Promise.all([
    listarPastas(supabase, sessao.escritorioId),
    listarAgenda(supabase, sessao.escritorioId, {
      pastaId: fPasta || undefined,
      tipo: (fTipo as ItemAgenda["tipo"]) || undefined,
    }),
  ]);

  // Cancelada nunca; concluída só com o toggle.
  const visiveis = itens.filter((i) => {
    if (i.status === "cancelada") return verConcluidas;
    if (i.status === "concluida") return verConcluidas;
    return true;
  });

  // Índice por dia.
  const porDia = new Map<string, ItemAgenda[]>();
  for (const item of visiveis) {
    const lista = porDia.get(item.data) ?? [];
    lista.push(item);
    porDia.set(item.data, lista);
  }

  const semanas = vista === "mes" ? semanasDoMes(mesRef) : [semanaDe(diaRef)];

  // ── URLs de navegação e de troca de vista ────────────────────────────────
  const filtros = new URLSearchParams();
  if (fPasta) filtros.set("pasta", fPasta);
  if (fTipo) filtros.set("tipo", fTipo);
  if (verConcluidas) filtros.set("concluidas", "1");
  const q = (extra: Record<string, string>) => {
    const p = new URLSearchParams(filtros);
    for (const [k, v] of Object.entries(extra)) p.set(k, v);
    return `/agenda/calendario?${p.toString()}` as Route;
  };

  const anterior =
    vista === "mes"
      ? q({ vista: "mes", mes: mesAnterior(mesRef) })
      : q({ vista: "semana", dia: somarDias(diaRef, -7) });
  const seguinte =
    vista === "mes"
      ? q({ vista: "mes", mes: mesSeguinte(mesRef) })
      : q({ vista: "semana", dia: somarDias(diaRef, 7) });
  const irParaHoje =
    vista === "mes"
      ? q({ vista: "mes", mes: mesDaData(hoje) })
      : q({ vista: "semana", dia: hoje });

  const rotuloRef =
    vista === "mes"
      ? capitalizar(formatarMesAno(mesRef))
      : `Semana de ${formatarDataBR(semanas[0][0])}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="titulo-pagina">Calendário</h1>
          <p className="subtitulo-pagina">
            {formatarDataBR(hoje)} ({nomeDoDiaDaSemana(hoje)}) · {visiveis.length}{" "}
            atividade{visiveis.length === 1 ? "" : "s"} no período carregado
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="abas">
            <Link
              href="/agenda"
              className="aba"
              data-ativa={false}
            >
              Lista
            </Link>
            <Link
              href={q({ vista }) as Route}
              className="aba"
              data-ativa={true}
            >
              Calendário
            </Link>
          </div>
          <Link href="/atividades/nova" className="botao-primario flex-none">
            + Nova atividade
          </Link>
        </div>
      </div>

      {/* Navegação + vista */}
      <div className="card flex flex-wrap items-center justify-between gap-3 p-3">
        <div className="flex items-center gap-2">
          <Link href={anterior} className="botao-secundario" aria-label="Anterior">
            ‹
          </Link>
          <Link href={irParaHoje} className="botao-secundario">
            Hoje
          </Link>
          <Link href={seguinte} className="botao-secundario" aria-label="Próximo">
            ›
          </Link>
          <span className="ml-1 text-sm font-semibold">{rotuloRef}</span>
        </div>
        <div className="abas">
          <Link
            href={q({ vista: "mes", mes: mesRef })}
            className="aba"
            data-ativa={vista === "mes"}
          >
            Mês
          </Link>
          <Link
            href={q({ vista: "semana", dia: diaRef })}
            className="aba"
            data-ativa={vista === "semana"}
          >
            Semana
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <form
        method="get"
        action="/agenda/calendario"
        className="card flex flex-wrap items-end gap-3 p-4"
      >
        <input type="hidden" name="vista" value={vista} />
        <input type="hidden" name="mes" value={mesRef} />
        <input type="hidden" name="dia" value={diaRef} />
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
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            name="concluidas"
            value="1"
            defaultChecked={verConcluidas}
          />
          Mostrar concluídas e canceladas
        </label>
        <button type="submit" className="botao-primario h-[38px]">
          Aplicar
        </button>
        {(fPasta || fTipo || verConcluidas) && (
          <Link
            href={
              `/agenda/calendario?vista=${vista}&mes=${mesRef}&dia=${diaRef}` as Route
            }
            className="link-acao pb-2.5"
          >
            Limpar
          </Link>
        )}
      </form>

      {/* Grade */}
      <div className="overflow-x-auto">
        <div className="min-w-[860px]">
          <div className="grid grid-cols-7 gap-px">
            {CABECALHO_SEMANA.map((d) => (
              <div
                key={d}
                className="bg-tint-1 py-2 text-center text-xs font-semibold uppercase tracking-wide text-texto-secundario"
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-px bg-tint-2">
            {semanas.flat().map((dia) => (
              <Celula
                key={dia}
                dia={dia}
                itens={porDia.get(dia) ?? []}
                ehHoje={dia === hoje}
                foraDoMes={vista === "mes" && !ehDoMes(dia, mesRef)}
                vista={vista}
                hrefSemana={q({ vista: "semana", dia })}
              />
            ))}
          </div>
        </div>
      </div>

      <Legenda />
    </div>
  );
}

function Celula({
  dia,
  itens,
  ehHoje,
  foraDoMes,
  vista,
  hrefSemana,
}: {
  dia: string;
  itens: ItemAgenda[];
  ehHoje: boolean;
  foraDoMes: boolean;
  vista: "mes" | "semana";
  hrefSemana: Route;
}) {
  const { dia: numero } = partesDaData(dia);
  const limite = vista === "mes" ? 3 : 20;
  const mostrados = itens.slice(0, limite);
  const resto = itens.length - mostrados.length;

  return (
    <div
      className="flex min-h-[116px] flex-col gap-1 bg-superficie p-1.5"
      style={{
        background: foraDoMes ? "var(--tint-1)" : "var(--superficie)",
        minHeight: vista === "semana" ? 320 : undefined,
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className={
            "text-xs font-semibold " +
            (foraDoMes ? "text-texto-secundario/60" : "text-texto")
          }
        >
          {vista === "mes" ? (
            <Link href={hrefSemana} className="hover:text-teal hover:no-underline">
              {numero}
            </Link>
          ) : (
            numero
          )}
        </span>
        {ehHoje && (
          <span className="rounded bg-teal px-1.5 py-0.5 text-[10px] font-semibold text-white">
            hoje
          </span>
        )}
      </div>

      {mostrados.map((item) => (
        <Link
          key={item.id}
          href={`/agenda/${item.id}`}
          className="flex flex-col rounded border-l-[3px] bg-fundo px-1.5 py-1 text-[11px] leading-tight hover:no-underline"
          style={{
            borderColor: COR_TIPO[item.tipo],
            opacity:
              item.status === "concluida" || item.status === "cancelada"
                ? 0.5
                : 1,
          }}
          title={`${TIPO_LABEL[item.tipo]} · ${item.pastaNome ?? item.pastaCodigo}`}
        >
          <span className="truncate font-medium text-texto">
            {item.status === "concluida" ? "✓ " : ""}
            {item.recorrente ? "↻ " : ""}
            {item.titulo ?? item.tipoAtividadeNome ?? "atividade"}
          </span>
          <span className="truncate text-texto-secundario">
            {item.pastaNome ?? item.pastaCodigo}
          </span>
        </Link>
      ))}

      {resto > 0 && (
        <Link
          href={hrefSemana}
          className="px-1 text-[11px] font-medium text-teal hover:no-underline"
        >
          +{resto} mais
        </Link>
      )}
    </div>
  );
}

function Legenda() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-texto-secundario">
      {(["prazo", "compromisso", "monitoramento"] as const).map((t) => (
        <span key={t} className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-1 rounded"
            style={{ background: COR_TIPO[t] }}
          />
          {TIPO_LABEL[t]}
        </span>
      ))}
      <span>↻ recorrente · ✓ concluída</span>
    </div>
  );
}

function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
