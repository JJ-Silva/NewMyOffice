import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";
import {
  exigirSessao,
  exigirPermissao,
  sessaoPode,
} from "@/lib/supabase/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { hojeNoBrasil } from "@/lib/hoje";
import {
  buscarProcesso,
  buscarProcessoGeralDaPasta,
  buscarProcessoParaSelecao,
  listarProcessos,
} from "@/lib/db/processos";
import { linhasDoProcesso } from "@/lib/domain/rotulo-processo";
import {
  listarAndamentosDoProcesso,
  listarAndamentosDaPasta,
  processoComAndamentoMaisRecente,
} from "@/lib/db/andamentos";
import { montarFio } from "@/lib/tramitacao-fio";
import { SeletorProcessoTramitacao } from "@/components/SeletorProcessoTramitacao";
import { FioTramitacao } from "@/components/FioTramitacao";
import { postarAndamento } from "./acoes";

export default async function PaginaTramitacao({
  searchParams,
}: PageProps<"/tramitacao">) {
  const sp = await searchParams;
  const sessao = await exigirSessao();
  exigirPermissao(sessao, "tramitacao.ver");
  const podePostar = sessaoPode(sessao, "tramitacao.criar");
  const supabase = await criarClienteServidor();

  const processoParam = typeof sp.processo === "string" ? sp.processo : "";
  const processoId =
    processoParam ||
    (await processoComAndamentoMaisRecente(supabase, sessao.escritorioId)) ||
    "";

  const processo = processoId
    ? await buscarProcesso(supabase, sessao.escritorioId, processoId)
    : null;

  // Nada escolhido e ninguém tem andamento ainda.
  if (!processo) {
    return (
      <Moldura seletor={<SeletorProcessoTramitacao />}>
        <div className="painel-vazio">
          Escolha um processo ou pasta acima para ver a tramitação.
        </div>
      </Moldura>
    );
  }

  const temPasta = Boolean(processo.pastaId);
  const vistaParam =
    sp.vista === "processo" || sp.vista === "caso" ? sp.vista : null;
  const vista: "caso" | "processo" =
    !temPasta || vistaParam === "processo"
      ? "processo"
      : (vistaParam ?? "caso");

  const rotulo = linhasDoProcesso({
    tipo: processo.tipo,
    numero: processo.numero,
    pastaCodigo: processo.pastaCodigo,
    pastaNome: processo.pastaNome,
    clienteNome: processo.clienteNome,
  });

  const [andamentos, geralDaPasta, outrosProcessos] = await Promise.all([
    vista === "caso" && processo.pastaId
      ? listarAndamentosDaPasta(supabase, sessao.escritorioId, processo.pastaId)
      : listarAndamentosDoProcesso(supabase, sessao.escritorioId, processoId),
    vista === "caso" && processo.pastaId
      ? buscarProcessoGeralDaPasta(supabase, sessao.escritorioId, processo.pastaId)
      : Promise.resolve(null),
    vista === "caso" && processo.pastaId
      ? listarProcessos(supabase, sessao.escritorioId, { pastaId: processo.pastaId })
      : Promise.resolve([]),
  ]);

  const dias = montarFio(andamentos, {
    meuMembroId: sessao.membro.id,
    hoje: hojeNoBrasil(),
    mostrarProcesso: vista === "caso",
  });

  // Post: na vista "caso" grava no "geral" da pasta; senão no processo exibido.
  const processoDoPost =
    vista === "caso" ? (geralDaPasta ?? processoId) : processoId;

  // Rótulo inicial do seletor (SSR), pro botão não piscar "Escolher…".
  const inicialSeletor = await buscarProcessoParaSelecao(
    supabase,
    sessao.escritorioId,
    processoId,
  );
  const rotuloSeletor = inicialSeletor
    ? linhasDoProcesso(inicialSeletor).primario
    : rotulo.primario;

  const base = `/tramitacao?processo=${encodeURIComponent(processoId)}`;

  return (
    <Moldura
      seletor={
        <SeletorProcessoTramitacao
          processoAtual={processoId}
          rotuloAtual={rotuloSeletor}
        />
      }
    >
      <div className="flex flex-col gap-3 rounded-xl border border-tint-2 bg-white p-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-[15px] font-semibold">{rotulo.primario}</span>
          <span className="text-[12.5px] text-texto-secundario">
            {rotulo.secundario || "processo sem pasta"}
          </span>
          {vista === "caso" && outrosProcessos.length > 0 && (
            <span className="text-xs tabular-nums text-texto-secundario">
              {outrosProcessos
                .map((p) => p.numero ?? "sem número")
                .join("  ·  ")}
            </span>
          )}
        </div>

        {temPasta && (
          <div className="flex gap-1.5">
            <Alternador href={`${base}&vista=caso` as Route} ativo={vista === "caso"}>
              Caso inteiro
            </Alternador>
            <Alternador
              href={`${base}&vista=processo` as Route}
              ativo={vista === "processo"}
            >
              Este processo
            </Alternador>
          </div>
        )}
      </div>

      <FioTramitacao
        dias={dias}
        podePostar={podePostar}
        acaoPostar={postarAndamento.bind(null, processoDoPost)}
        semNada={andamentos.length === 0}
      />
    </Moldura>
  );
}

function Moldura({
  seletor,
  children,
}: {
  seletor: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex max-w-[900px] flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <h1 className="titulo-pagina">Tramitação</h1>
        <p className="subtitulo-pagina">
          O fio de cada caso — o que o sistema capturou e o que a equipe anotou,
          em ordem.
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="rotulo">Processo ou pasta</span>
        <div className="max-w-[460px]">{seletor}</div>
      </div>
      {children}
    </div>
  );
}

function Alternador({
  href,
  ativo,
  children,
}: {
  href: Route;
  ativo: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold hover:no-underline ${
        ativo
          ? "border-teal bg-fundo text-teal"
          : "border-tint-2 bg-white text-texto-secundario"
      }`}
    >
      {children}
    </Link>
  );
}
