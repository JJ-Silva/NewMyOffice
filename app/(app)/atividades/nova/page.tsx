import Link from "next/link";
import { redirect } from "next/navigation";
import { exigirSessao, exigirPermissao } from "@/lib/supabase/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { hojeNoBrasil } from "@/lib/hoje";
import { listarProcessosParaSelecao } from "@/lib/db/processos";
import { listarTiposDeAtividade } from "@/lib/db/tipos-atividade";
import { listarTribunais } from "@/lib/db/tribunais";
import { urlDaTela, comRetorno } from "@/lib/navegacao";
import { lerCampos, calcular } from "./calculo";
import { AbasTipo, type AbaTipo } from "./abas-tipo";
import { FormularioPrazo } from "./formulario-prazo";
import { FormularioCompromisso } from "./formulario-compromisso";
import { FormularioMonitoramento } from "./formulario-monitoramento";

const TITULOS: Record<AbaTipo, string> = {
  prazo: "Novo prazo",
  compromisso: "Novo compromisso",
  monitoramento: "Novo monitoramento",
};

export default async function PaginaNovaAtividade({
  searchParams,
}: PageProps<"/atividades/nova">) {
  const sessao = await exigirSessao();
  exigirPermissao(sessao, "atividades.criar");
  const supabase = await criarClienteServidor();
  const params = await searchParams;

  const get = (k: string) => {
    const v = params[k];
    return typeof v === "string" ? v : null;
  };
  const abaParam = get("aba");
  const aba: AbaTipo =
    abaParam === "compromisso" || abaParam === "monitoramento"
      ? abaParam
      : "prazo";
  const erro = get("erro");
  const campos = lerCampos(get);
  const hrefCriarPasta = comRetorno(
    "/pastas/nova",
    urlDaTela("/atividades/nova", params),
  );

  const todosProcessos = await listarProcessosParaSelecao(
    supabase,
    sessao.escritorioId,
  );
  // Toda pasta nasce com um processo 'geral' → sem processos = sem pastas.
  if (todosProcessos.length === 0) {
    redirect(hrefCriarPasta);
  }

  // Processo em foco (compartilhado entre as 3 abas):
  //  - ?processo=… / ?processo_id=…  → direto
  //  - ?pasta=…                      → o "geral" dessa pasta
  const pastaParam = get("pasta") ?? "";
  let processoSelecionado = campos.processoId || (get("processo") ?? "");
  if (!processoSelecionado && pastaParam) {
    processoSelecionado =
      todosProcessos.find(
        (p) => p.pastaId === pastaParam && p.tipo === "geral",
      )?.id ?? "";
  }
  campos.processoId = processoSelecionado;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Link href="/agenda" className="link-acao self-start">
          ← Voltar para a agenda
        </Link>
        <h1 className="titulo-pagina">{TITULOS[aba]}</h1>
      </div>

      <div className="max-w-[420px]">
        <AbasTipo aba={aba} processoId={processoSelecionado} />
      </div>

      {aba === "prazo" && (
        <PrazoComDados
          campos={campos}
          processos={todosProcessos}
          erro={erro}
          escritorioId={sessao.escritorioId}
          hrefCriarPasta={hrefCriarPasta}
        />
      )}

      {aba === "compromisso" && (
        <FormularioCompromisso
          processos={todosProcessos}
          tipos={await listarTiposDeAtividade(
            supabase,
            sessao.escritorioId,
            "compromisso",
          )}
          processoSelecionado={processoSelecionado}
          data=""
          erro={erro}
          hrefCriarPasta={hrefCriarPasta}
        />
      )}

      {aba === "monitoramento" && (
        <FormularioMonitoramento
          processos={todosProcessos}
          tipos={await listarTiposDeAtividade(
            supabase,
            sessao.escritorioId,
            "monitoramento",
          )}
          processoSelecionado={processoSelecionado}
          data={hojeNoBrasil()}
          erro={erro}
          hrefCriarPasta={hrefCriarPasta}
        />
      )}
    </div>
  );
}

// Carrega tudo que o formulário de prazo precisa (tipos, tribunais, cálculo).
async function PrazoComDados({
  campos,
  processos,
  erro,
  escritorioId,
  hrefCriarPasta,
}: {
  campos: ReturnType<typeof lerCampos>;
  processos: Awaited<ReturnType<typeof listarProcessosParaSelecao>>;
  erro: string | null;
  escritorioId: string;
  hrefCriarPasta: string;
}) {
  const supabase = await criarClienteServidor();
  const [tipos, tribunais] = await Promise.all([
    listarTiposDeAtividade(supabase, escritorioId, "prazo"),
    listarTribunais(supabase, escritorioId),
  ]);

  // Se o prazo é de um processo judicial e o tribunal ainda não foi escolhido,
  // pré-seleciona o tribunal do processo (identificado pelo CNJ no cadastro).
  let tribunalPreSelecionado = campos.tribunalId;
  if (campos.processoId && !tribunalPreSelecionado) {
    const { data } = await supabase
      .from("processo_judicial")
      .select("tribunal_id")
      .eq("processo_id", campos.processoId)
      .is("deletado_em", null)
      .maybeSingle();
    tribunalPreSelecionado = (data?.tribunal_id as string | null) ?? null;
  }
  const camposEfetivos = { ...campos, tribunalId: tribunalPreSelecionado };

  const tentouCalcular = Boolean(
    camposEfetivos.processoId &&
      camposEfetivos.tipoAtividadeId &&
      camposEfetivos.eventoData,
  );
  const calc = tentouCalcular
    ? await calcular(supabase, escritorioId, camposEfetivos, hojeNoBrasil())
    : null;

  return (
    <FormularioPrazo
      campos={camposEfetivos}
      processos={processos}
      tipos={tipos}
      tribunais={tribunais}
      calc={calc}
      erro={erro}
      hrefCriarPasta={hrefCriarPasta}
    />
  );
}
