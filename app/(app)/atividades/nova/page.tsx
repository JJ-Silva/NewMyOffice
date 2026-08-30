import Link from "next/link";
import { redirect } from "next/navigation";
import { exigirSessao } from "@/lib/supabase/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { hojeNoBrasil } from "@/lib/hoje";
import { listarPastas } from "@/lib/db/pastas";
import { listarProcessosDaPasta } from "@/lib/db/processos";
import { listarTiposDeAtividade } from "@/lib/db/tipos-atividade";
import { listarTribunais } from "@/lib/db/tribunais";
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

  const pastas = await listarPastas(supabase, sessao.escritorioId);
  if (pastas.length === 0) {
    redirect("/clientes/novo");
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
        <AbasTipo aba={aba} pastaId={campos.pastaId} />
      </div>

      {aba === "prazo" && (
        <PrazoComDados
          campos={campos}
          pastas={pastas}
          erro={erro}
          escritorioId={sessao.escritorioId}
        />
      )}

      {aba === "compromisso" && (
        <FormularioCompromisso
          pastas={pastas}
          tipos={await listarTiposDeAtividade(
            supabase,
            sessao.escritorioId,
            "compromisso",
          )}
          pastaSelecionada={campos.pastaId}
          data=""
          erro={erro}
        />
      )}

      {aba === "monitoramento" && (
        <FormularioMonitoramento
          pastas={pastas}
          tipos={await listarTiposDeAtividade(
            supabase,
            sessao.escritorioId,
            "monitoramento",
          )}
          pastaSelecionada={campos.pastaId}
          data={hojeNoBrasil()}
          erro={erro}
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
}: {
  campos: ReturnType<typeof lerCampos>;
  pastas: Awaited<ReturnType<typeof listarPastas>>;
  erro: string | null;
  escritorioId: string;
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
    />
  );
}
