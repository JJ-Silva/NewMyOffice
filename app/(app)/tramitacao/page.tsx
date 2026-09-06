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
  type ProcessoLista,
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
  const vista = resolverVista(sp.vista, temPasta);
  // Na vista "caso" o fio soma todos os processos da pasta; senão, só este.
  const pastaAgregada = vista === "caso" ? processo.pastaId : null;

  const rotulo = linhasDoProcesso({
    tipo: processo.tipo,
    numero: processo.numero,
    pastaCodigo: processo.pastaCodigo,
    pastaNome: processo.pastaNome,
    clienteNome: processo.clienteNome,
  });

  // Cabeçalho: na vista "caso" lidera pela pasta; na "processo", pelo número.
  const cabecalho =
    vista === "caso"
      ? {
          titulo: processo.pastaNome ?? processo.pastaCodigo ?? "Caso",
          sub: [processo.pastaCodigo, processo.clienteNome]
            .filter(Boolean)
            .join(" · "),
        }
      : {
          titulo: rotulo.primario,
          sub: rotulo.secundario || "processo sem pasta",
        };

  const [andamentos, geralDaPasta, outrosProcessos] = await Promise.all([
    pastaAgregada
      ? listarAndamentosDaPasta(supabase, sessao.escritorioId, pastaAgregada)
      : listarAndamentosDoProcesso(supabase, sessao.escritorioId, processoId),
    pastaAgregada
      ? buscarProcessoGeralDaPasta(supabase, sessao.escritorioId, pastaAgregada)
      : Promise.resolve(null),
    pastaAgregada
      ? listarProcessos(supabase, sessao.escritorioId, { pastaId: pastaAgregada })
      : Promise.resolve<ProcessoLista[]>([]),
  ]);

  const dias = montarFio(andamentos, {
    meuMembroId: sessao.membro.id,
    hoje: hojeNoBrasil(),
    mostrarProcesso: vista === "caso",
  });

  // Post: na vista "caso" grava no "geral" da pasta; senão no processo exibido.
  const processoDoPost = pastaAgregada
    ? (geralDaPasta ?? processoId)
    : processoId;

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
          <span className="text-[15px] font-semibold">{cabecalho.titulo}</span>
          <span className="text-[12.5px] text-texto-secundario">
            {cabecalho.sub}
          </span>
          {vista === "caso" && outrosProcessos.length > 0 && (
            <span className="text-xs tabular-nums text-texto-secundario">
              Processos:{" "}
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
      />
    </Moldura>
  );
}

// caso: fio agregado da pasta (default quando há pasta). processo: só este
// número (único modo possível quando o processo não tem pasta).
function resolverVista(
  param: string | string[] | undefined,
  temPasta: boolean,
): "caso" | "processo" {
  if (!temPasta || param === "processo") return "processo";
  return "caso";
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
