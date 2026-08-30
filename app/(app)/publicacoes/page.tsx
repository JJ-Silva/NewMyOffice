import Link from "next/link";
import type { Route } from "next";
import { exigirSessao } from "@/lib/supabase/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { hojeNoBrasil } from "@/lib/hoje";
import { somarDias, formatarDataBR } from "@/lib/domain/datas";
import { listarOabs } from "@/lib/db/oab";
import {
  listarPublicacoes,
  type PublicacaoLista,
  type StatusPublicacao,
} from "@/lib/db/publicacoes";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { buscarNoDjen, descartar, reabrir } from "./acoes";

const ABAS: { valor: StatusPublicacao | "todas"; label: string }[] = [
  { valor: "nova", label: "Novas" },
  { valor: "virou_prazo", label: "Viraram prazo" },
  { valor: "descartada", label: "Descartadas" },
  { valor: "todas", label: "Todas" },
];

export default async function PaginaPublicacoes({
  searchParams,
}: PageProps<"/publicacoes">) {
  const sessao = await exigirSessao();
  const supabase = await criarClienteServidor();
  const params = await searchParams;
  const hoje = hojeNoBrasil();

  const abaParam = typeof params.status === "string" ? params.status : "nova";
  const aba = (ABAS.find((a) => a.valor === abaParam)?.valor ?? "nova") as
    | StatusPublicacao
    | "todas";

  const erro = typeof params.erro === "string" ? params.erro : null;
  const novas = typeof params.novas === "string" ? Number(params.novas) : null;
  const repetidas =
    typeof params.repetidas === "string" ? Number(params.repetidas) : null;

  const [oabs, publicacoes] = await Promise.all([
    listarOabs(supabase, sessao.escritorioId),
    listarPublicacoes(
      supabase,
      sessao.escritorioId,
      aba === "todas" ? {} : { status: aba },
    ),
  ]);
  const oabsAtivas = oabs.filter((o) => o.ativo);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <h1 className="titulo-pagina">Publicações do DJEN</h1>
        <p className="subtitulo-pagina">
          Intimações do Diário de Justiça Nacional das OABs do escritório.
          Trie cada uma: vira prazo ou é descartada.
        </p>
      </div>

      {/* Buscar */}
      <form
        action={buscarNoDjen}
        className="card flex flex-wrap items-end gap-3 p-4"
      >
        <label className="flex flex-col gap-1.5">
          <span className="rotulo">De</span>
          <input
            type="date"
            name="data_inicio"
            defaultValue={somarDias(hoje, -7)}
            className="campo"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="rotulo">Até</span>
          <input
            type="date"
            name="data_fim"
            defaultValue={hoje}
            className="campo"
          />
        </label>
        <BotaoEnviar
          className="botao-primario h-[38px]"
          rotuloOcupado="Buscando no DJEN…"
          disabled={oabsAtivas.length === 0}
        >
          Buscar no DJEN
        </BotaoEnviar>
        <span className="pb-2 text-xs text-texto-secundario">
          {oabsAtivas.length === 0 ? (
            <>
              Nenhuma OAB ativa.{" "}
              <Link href="/configuracoes" className="link-acao">
                Cadastrar em Configurações
              </Link>
            </>
          ) : (
            `${oabsAtivas.length} OAB${oabsAtivas.length === 1 ? "" : "s"}: ` +
            oabsAtivas.map((o) => `${o.numero}/${o.uf}`).join(", ")
          )}
        </span>
      </form>

      {erro && (
        <p className="rounded-lg border border-atrasado bg-[var(--atrasado-fundo)] px-3 py-2 text-sm text-atrasado">
          {erro}
        </p>
      )}
      {novas !== null && (
        <div className="rounded-lg border border-cumprido bg-[#F0FDF4] px-3.5 py-2.5 text-sm text-[#166534]">
          {novas === 0
            ? "Nenhuma publicação nova no período."
            : `${novas} publicaç${novas === 1 ? "ão nova" : "ões novas"}.`}
          {repetidas ? ` ${repetidas} já estavam na lista.` : ""}
        </div>
      )}

      {/* Abas de status */}
      <div className="abas max-w-[520px]">
        {ABAS.map((a) => (
          <Link
            key={a.valor}
            href={`/publicacoes?status=${a.valor}` as Route}
            className="aba"
            data-ativa={aba === a.valor}
          >
            {a.label}
          </Link>
        ))}
      </div>

      {publicacoes.length === 0 ? (
        <div className="painel-vazio">
          {aba === "nova"
            ? "Nenhuma publicação para triar. Use “Buscar no DJEN”."
            : "Nada aqui."}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {publicacoes.map((p) => (
            <Cartao key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function Cartao({ p }: { p: PublicacaoLista }) {
  return (
    <div className="card flex flex-col gap-2.5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm font-semibold">
            {p.siglaTribunal ?? "—"} · {p.nomeOrgao ?? "órgão não informado"}
          </span>
          <span className="text-xs text-texto-secundario">
            Disponibilizado em {formatarDataBR(p.dataDisponibilizacao)} ·{" "}
            {p.tipoComunicacao ?? "—"}
            {p.nomeClasse ? ` · ${p.nomeClasse}` : ""}
          </span>
        </div>
        <span
          className="rounded-md px-2 py-1 text-xs font-medium"
          style={{
            background: p.processoId ? "var(--tint-1)" : "var(--fundo)",
            color: p.processoId ? "var(--teal)" : "var(--texto-secundario)",
          }}
        >
          {p.processoId
            ? `${p.pastaNome ?? p.pastaCodigo} · ${p.clienteNome ?? "sem cliente"}`
            : p.cnj
              ? "CNJ sem processo cadastrado"
              : "sem nº de processo"}
        </span>
      </div>

      <p className="text-[13px] leading-relaxed text-texto">
        {p.resumo}
      </p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-texto-secundario">
        {p.cnj && <span className="tabular-nums">{p.cnj}</span>}
        {p.semPrazoProvavel && p.status === "nova" && (
          <span className="text-aviso">parece informativa (sem prazo)</span>
        )}
        {p.status === "virou_prazo" && p.atividadeId && (
          <Link href={`/agenda/${p.atividadeId}`} className="link-acao">
            ver o prazo criado
          </Link>
        )}
        {p.status === "descartada" && (
          <span>descartada</span>
        )}
      </div>

      {p.status === "nova" && (
        <div className="flex flex-wrap items-center gap-2 border-t border-tint-1 pt-2.5">
          <Link
            href={`/publicacoes/${p.id}`}
            className="botao-primario h-[34px]"
          >
            Triar →
          </Link>
          <form action={descartar} className="flex items-center gap-2">
            <input type="hidden" name="id" value={p.id} />
            <input
              name="motivo"
              placeholder="motivo (opcional)"
              className="campo h-[34px] w-[200px] text-xs"
            />
            <BotaoEnviar className="botao-secundario h-[34px]" rotuloOcupado="…">
              Descartar
            </BotaoEnviar>
          </form>
        </div>
      )}

      {p.status === "descartada" && (
        <div className="border-t border-tint-1 pt-2.5">
          <form action={reabrir}>
            <input type="hidden" name="id" value={p.id} />
            <BotaoEnviar className="botao-secundario h-[34px]" rotuloOcupado="…">
              Reabrir
            </BotaoEnviar>
          </form>
        </div>
      )}
    </div>
  );
}
