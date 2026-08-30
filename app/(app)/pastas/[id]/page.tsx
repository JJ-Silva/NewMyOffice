import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirSessao } from "@/lib/supabase/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { formatarDataBR } from "@/lib/domain/datas";
import { buscarPasta } from "@/lib/db/pastas";
import { listarAreas } from "@/lib/db/areas";
import { listarClientes } from "@/lib/db/clientes";
import { listarProcessos } from "@/lib/db/processos";
import { listarProcessosDaPasta } from "@/lib/db/processos";
import { listarPartesDoProcesso, TIPOS_PARTE } from "@/lib/db/partes";
import {
  salvarPasta,
  adicionarCliente,
  removerCliente,
  adicionarParteAction,
  removerParteAction,
} from "./acoes";

const STATUS_PASTA = [
  { valor: "ativa", label: "Ativa" },
  { valor: "arquivada", label: "Arquivada" },
  { valor: "suspensa", label: "Suspensa" },
];

export default async function PaginaPasta({
  params,
  searchParams,
}: PageProps<"/pastas/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const erro = typeof sp.erro === "string" ? sp.erro : null;

  const sessao = await exigirSessao();
  const supabase = await criarClienteServidor();
  const pasta = await buscarPasta(supabase, sessao.escritorioId, id);
  if (!pasta) {
    notFound();
  }

  const [areas, todosClientes, processosDetalhe, processosCrus] =
    await Promise.all([
      listarAreas(supabase, sessao.escritorioId),
      listarClientes(supabase, sessao.escritorioId),
      listarProcessos(supabase, sessao.escritorioId, { pastaId: id }),
      listarProcessosDaPasta(supabase, id),
    ]);

  const geral = processosCrus.find((p) => p.tipo === "geral");
  const clientesVinculadosIds = new Set(pasta.clientes.map((c) => c.id));
  const clientesDisponiveis = todosClientes.filter(
    (c) => !clientesVinculadosIds.has(c.id),
  );

  // partes por processo (judicial/administrativo)
  const partesPorProcesso = await Promise.all(
    processosDetalhe.map((p) =>
      listarPartesDoProcesso(supabase, p.id).then((partes) => ({
        processoId: p.id,
        partes,
      })),
    ),
  );
  const partesDe = (processoId: string) =>
    partesPorProcesso.find((x) => x.processoId === processoId)?.partes ?? [];

  return (
    <div className="flex max-w-[900px] flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Link href="/pastas" className="link-acao self-start">
          ← Voltar para pastas
        </Link>
        <span className="text-xs text-texto-secundario">
          {pasta.codigo} · {pasta.area_nome ?? "sem área"} ·{" "}
          {STATUS_PASTA.find((s) => s.valor === pasta.status)?.label}
        </span>
        <h1 className="titulo-pagina">{pasta.nome ?? pasta.codigo}</h1>
        <p className="subtitulo-pagina">
          {pasta.clientes.map((c) => c.nome).join(", ") || "sem cliente"}
        </p>
      </div>

      {erro && (
        <p className="rounded-lg border border-atrasado bg-[var(--atrasado-fundo)] px-3 py-2 text-sm text-atrasado">
          {erro}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <Link href={`/atividades/nova?pasta=${pasta.id}`} className="botao-secundario">
          + Atividade
        </Link>
        <Link href={`/processos/novo?tipo=judicial&pasta=${pasta.id}`} className="botao-secundario">
          + Processo
        </Link>
        <Link href={`/agenda?pasta=${pasta.id}&tudo=1`} className="botao-secundario">
          Ver agenda desta pasta
        </Link>
      </div>

      {/* Editar */}
      <details className="card p-5">
        <summary className="cursor-pointer text-sm font-semibold">
          Editar pasta
        </summary>
        <form action={salvarPasta} className="mt-3 flex flex-col gap-3">
          <input type="hidden" name="id" value={pasta.id} />
          <div className="grid gap-3 [grid-template-columns:1fr_180px_160px]">
            <label className="flex flex-col gap-1.5">
              <span className="rotulo">Nome da pasta</span>
              <input name="nome" defaultValue={pasta.nome ?? ""} className="campo" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="rotulo">Área</span>
              <select name="area_id" defaultValue={pasta.area_id ?? ""} className="campo">
                <option value="">— sem área —</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="rotulo">Status</span>
              <select name="status" defaultValue={pasta.status} className="campo">
                {STATUS_PASTA.map((s) => (
                  <option key={s.valor} value={s.valor}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="rotulo">Objetivo (o que se busca)</span>
            <input name="objetivo" defaultValue={pasta.objetivo ?? ""} className="campo" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="rotulo">Objeto (sobre o que é)</span>
            <input name="objeto" defaultValue={pasta.objeto ?? ""} className="campo" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="rotulo">Referência externa (pasta antiga)</span>
            <input
              name="referencia_externa"
              defaultValue={pasta.referencia_externa ?? ""}
              className="campo"
            />
          </label>
          <button type="submit" className="botao-primario h-[38px] self-start">
            Salvar pasta
          </button>
        </form>
      </details>

      {/* Clientes */}
      <div className="card flex flex-col gap-3 p-5">
        <span className="text-sm font-semibold">Clientes</span>
        <div className="flex flex-col gap-2">
          {pasta.clientes.map((c) => (
            <div key={c.id} className="linha-lista">
              <span className="flex-1 text-[13.5px]">{c.nome}</span>
              {pasta.clientes.length > 1 && (
                <form action={removerCliente}>
                  <input type="hidden" name="id" value={pasta.id} />
                  <input type="hidden" name="cliente_id" value={c.id} />
                  <button type="submit" className="botao-perigo">
                    Remover
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
        {clientesDisponiveis.length > 0 && (
          <form action={adicionarCliente} className="flex gap-2">
            <input type="hidden" name="id" value={pasta.id} />
            <select name="cliente_id" required className="campo flex-1" defaultValue="">
              <option value="" disabled>
                Adicionar cliente…
              </option>
              {clientesDisponiveis.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome} — {c.cpf_cnpj}
                </option>
              ))}
            </select>
            <button type="submit" className="botao-primario h-[38px]">
              Vincular
            </button>
          </form>
        )}
      </div>

      {/* Processos */}
      <div className="card flex flex-col gap-3 p-5">
        <span className="text-sm font-semibold">Processos da pasta</span>

        {geral && (
          <div className="linha-lista">
            <span className="etiqueta-sigla">geral</span>
            <span className="flex-1 text-[13.5px] text-texto-secundario">
              Trabalho interno da pasta — é aqui que o prazo se pendura quando
              não há processo judicial.
            </span>
          </div>
        )}

        {processosDetalhe.length === 0 ? (
          <p className="text-[13px] text-texto-secundario">
            Nenhum processo judicial ou administrativo.{" "}
            <Link href={`/processos/novo?tipo=judicial&pasta=${pasta.id}`}>
              Cadastrar
            </Link>
            .
          </p>
        ) : (
          processosDetalhe.map((p) => {
            const partes = partesDe(p.id);
            return (
              <div
                key={p.id}
                className="flex flex-col gap-2 rounded-lg border border-tint-2 p-3"
              >
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-[13.5px] font-semibold tabular-nums">
                    {p.numero ?? "sem número"}
                  </span>
                  <span className="text-xs text-texto-secundario">
                    {p.tipo === "judicial" ? "Judicial" : "Administrativo"}
                    {p.tipo === "judicial" && p.tribunalSigla
                      ? ` · ${p.tribunalSigla}`
                      : p.tipo === "judicial" && p.justica
                        ? ` · ${p.justica}`
                        : ""}
                    {p.tipo === "administrativo" && p.orgaoJulgador
                      ? ` · ${p.orgaoJulgador}`
                      : ""}
                    {p.fase ? ` · ${p.fase}` : ""}
                    {p.digitoConfere === false ? " · ⚠ DV não confere" : ""}
                  </span>
                </div>

                {/* Partes */}
                <div className="flex flex-col gap-1.5">
                  <span className="rotulo">Partes</span>
                  {partes.length === 0 ? (
                    <span className="text-xs text-texto-secundario">
                      Nenhuma parte cadastrada.
                    </span>
                  ) : (
                    partes.map((parte) => (
                      <div
                        key={parte.id}
                        className="flex items-center gap-2 text-[13px]"
                      >
                        <span className="rounded bg-fundo px-1.5 py-0.5 text-[11px] text-teal">
                          {TIPOS_PARTE.find((t) => t.valor === parte.tipo_parte)
                            ?.label ?? parte.tipo_parte}
                        </span>
                        <span className="flex-1">
                          {parte.nome}
                          {parte.cpf_cnpj ? ` · ${parte.cpf_cnpj}` : ""}
                          {parte.advogado_adverso
                            ? ` · adv. ${parte.advogado_adverso}${parte.oab_adverso ? ` (${parte.oab_adverso})` : ""}`
                            : ""}
                        </span>
                        <form action={removerParteAction}>
                          <input type="hidden" name="pasta_id" value={pasta.id} />
                          <input type="hidden" name="parte_id" value={parte.id} />
                          <button
                            type="submit"
                            className="text-xs text-atrasado hover:underline"
                          >
                            remover
                          </button>
                        </form>
                      </div>
                    ))
                  )}

                  <form
                    action={adicionarParteAction}
                    className="mt-1 grid gap-2 [grid-template-columns:1fr_150px_140px_120px_90px]"
                  >
                    <input type="hidden" name="pasta_id" value={pasta.id} />
                    <input type="hidden" name="processo_id" value={p.id} />
                    <input
                      name="nome"
                      required
                      placeholder="Nome da parte"
                      className="campo"
                    />
                    <select name="tipo_parte" required className="campo" defaultValue="">
                      <option value="" disabled>
                        Tipo…
                      </option>
                      {TIPOS_PARTE.map((t) => (
                        <option key={t.valor} value={t.valor}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                    <input name="cpf_cnpj" placeholder="CPF/CNPJ" className="campo" />
                    <input
                      name="advogado_adverso"
                      placeholder="Adv. adverso"
                      className="campo"
                    />
                    <button type="submit" className="botao-primario h-[38px] px-2">
                      +
                    </button>
                  </form>
                </div>
              </div>
            );
          })
        )}
      </div>

      <p className="text-xs text-texto-secundario">
        Distribuição / protocolo mais antigo:{" "}
        {processosDetalhe
          .map((p) => p.dataDistribuicao)
          .filter(Boolean)
          .sort()[0]
          ? formatarDataBR(
              processosDetalhe
                .map((p) => p.dataDistribuicao!)
                .filter(Boolean)
                .sort()[0],
            )
          : "—"}
      </p>
    </div>
  );
}
