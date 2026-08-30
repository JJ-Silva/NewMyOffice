import Link from "next/link";
import { exigirSessao } from "@/lib/supabase/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { formatarDataBR } from "@/lib/domain/datas";
import { listarProcessos } from "@/lib/db/processos";
import { listarPastas } from "@/lib/db/pastas";

function moeda(v: number | null): string {
  if (v === null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function PaginaProcessos({
  searchParams,
}: PageProps<"/processos">) {
  const sessao = await exigirSessao();
  const supabase = await criarClienteServidor();
  const params = await searchParams;
  const fPasta = typeof params.pasta === "string" ? params.pasta : "";

  const [processos, pastas] = await Promise.all([
    listarProcessos(supabase, sessao.escritorioId, {
      pastaId: fPasta || undefined,
    }),
    listarPastas(supabase, sessao.escritorioId),
  ]);

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex items-end justify-between gap-5">
        <div className="flex flex-col gap-1.5">
          <h1 className="titulo-pagina">Processos</h1>
          <p className="subtitulo-pagina">
            {processos.length} processo{processos.length === 1 ? "" : "s"}{" "}
            (judicial e administrativo)
          </p>
        </div>
        <Link href="/processos/novo" className="botao-primario flex-none">
          + Cadastrar processo
        </Link>
      </div>

      <form
        method="get"
        action="/processos"
        className="card flex flex-wrap items-end gap-3 p-4"
      >
        <label className="flex min-w-[240px] flex-1 flex-col gap-1.5">
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
        <button type="submit" className="botao-primario h-[38px]">
          Filtrar
        </button>
        {fPasta && (
          <Link href="/processos" className="link-acao pb-2.5">
            Limpar
          </Link>
        )}
      </form>

      {processos.length === 0 ? (
        <div className="painel-vazio">
          Nenhum processo cadastrado. Na Etapa 1 o prazo se liga ao processo
          “geral” da pasta; aqui você registra os processos judiciais e
          administrativos com número, tribunal e partes.
        </div>
      ) : (
        <div className="flex flex-col gap-2 overflow-x-auto pb-1">
          <div className="grid min-w-[940px] gap-4 px-[18px] pb-0.5 [grid-template-columns:minmax(190px,220px)_minmax(170px,1.4fr)_minmax(130px,1fr)_minmax(110px,auto)_120px]">
            <span className="rotulo">Número</span>
            <span className="rotulo">Pasta / cliente</span>
            <span className="rotulo">Juízo / órgão</span>
            <span className="rotulo">Fase</span>
            <span className="rotulo text-center">Ação</span>
          </div>

          {processos.map((x) => (
            <div
              key={x.id}
              className="card grid min-w-[940px] items-center gap-4 px-[18px] py-3 [grid-template-columns:minmax(190px,220px)_minmax(170px,1.4fr)_minmax(130px,1fr)_minmax(110px,auto)_120px]"
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[13.5px] font-semibold tabular-nums">
                  {x.numero ?? (x.tipo === "judicial" ? "sem número" : "adm.")}
                </span>
                <span className="text-xs text-texto-secundario">
                  {x.tipo === "judicial" ? "Judicial" : "Administrativo"}
                  {x.dataDistribuicao
                    ? ` · distribuído ${formatarDataBR(x.dataDistribuicao)}`
                    : ""}
                  {x.digitoConfere === false ? " · ⚠ DV não confere" : ""}
                </span>
              </div>

              <div className="flex min-w-0 flex-col gap-0.5">
                <Link
                  href={`/pastas/${x.pastaId}`}
                  className="truncate text-[13.5px] font-medium text-texto hover:text-teal hover:no-underline"
                >
                  {x.pastaNome ?? x.pastaCodigo}
                </Link>
                <span className="truncate text-xs text-texto-secundario">
                  {x.clienteNome ?? "sem cliente"}
                  {x.valorCausa !== null ? ` · ${moeda(x.valorCausa)}` : ""}
                </span>
              </div>

              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-[13px]">
                  {x.tipo === "judicial"
                    ? x.tribunalSigla ?? x.justica ?? "—"
                    : x.orgaoJulgador ?? "—"}
                </span>
                <span className="truncate text-xs text-texto-secundario">
                  {x.tipo === "judicial"
                    ? [x.vara, x.comarca].filter(Boolean).join(" · ") || "—"
                    : x.esfera ?? "—"}
                </span>
              </div>

              <span className="truncate text-[12px] font-medium">
                {x.fase ? (
                  <span className="rounded-md bg-fundo px-2 py-1 text-teal">
                    {x.fase}
                  </span>
                ) : (
                  <span className="text-texto-secundario">—</span>
                )}
              </span>

              <div className="flex justify-center">
                <Link
                  href={`/atividades/nova?pasta=${x.pastaId}`}
                  className="botao-secundario"
                >
                  + Prazo
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
