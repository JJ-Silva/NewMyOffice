import Link from "next/link";
import { redirect } from "next/navigation";
import { exigirSessao, exigirPermissao } from "@/lib/supabase/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { hojeNoBrasil } from "@/lib/hoje";
import { listarPastas } from "@/lib/db/pastas";
import {
  listarProcessosDaPasta,
  listarProcessosParaSelecao,
} from "@/lib/db/processos";
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

  const [pastas, todosProcessos] = await Promise.all([
    listarPastas(supabase, sessao.escritorioId),
    listarProcessosParaSelecao(supabase, sessao.escritorioId),
  ]);
  if (pastas.length === 0) {
    redirect(hrefCriarPasta);
  }

  // Processo em foco (compartilhado entre as abas):
  //  - ?processo=…  → direto
  //  - ?pasta=…     → o "geral" dessa pasta
  let processoSelecionado = get("processo") ?? "";
  if (!processoSelecionado && campos.pastaId) {
    processoSelecionado =
      todosProcessos.find(
        (p) => p.pastaId === campos.pastaId && p.tipo === "geral",
      )?.id ?? "";
  }
  // e a pasta desse processo, para a aba Prazo (que trabalha com pasta+nível)
  const processoEmFoco = todosProcessos.find((p) => p.id === processoSelecionado);
  if (processoEmFoco && !campos.pastaId) {
    campos.pastaId = processoEmFoco.pastaId;
    if (!campos.nivel) campos.nivel = processoEmFoco.id;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Link href="/agenda" className="link-acao self-start">
          ← Voltar para a agenda
        </Link>
        <h1 className="titulo-pagina">{TITULOS[aba]}</h1>
      </div>

      <div className="max-w-[420px]">
        <AbasTipo
          aba={aba}
          pastaId={campos.pastaId}
          processoId={processoSelecionado}
        />
      </div>

      {aba === "prazo" && (
        <PrazoComDados
          campos={campos}
          pastas={pastas}
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
  pastas,
  erro,
  escritorioId,
  hrefCriarPasta,
}: {
  campos: ReturnType<typeof lerCampos>;
  pastas: Awaited<ReturnType<typeof listarPastas>>;
  erro: string | null;
  escritorioId: string;
  hrefCriarPasta: string;
}) {
  const supabase = await criarClienteServidor();
  const [tipos, tribunais] = await Promise.all([
    listarTiposDeAtividade(supabase, escritorioId, "prazo"),
    listarTribunais(supabase, escritorioId),
  ]);

  const processos = campos.pastaId
    ? await listarProcessosDaPasta(supabase, campos.pastaId)
    : [];

  const tentouCalcular = Boolean(
    campos.pastaId && campos.tipoAtividadeId && campos.eventoData,
  );
  const calc = tentouCalcular
    ? await calcular(supabase, escritorioId, campos, hojeNoBrasil())
    : null;

  return (
    <FormularioPrazo
      campos={campos}
      pastas={pastas}
      processos={processos}
      tipos={tipos}
      tribunais={tribunais}
      calc={calc}
      erro={erro}
      hrefCriarPasta={hrefCriarPasta}
    />
  );
}
