import Link from "next/link";
import { notFound } from "next/navigation";
import {
  exigirSessao,
  exigirPermissao,
  sessaoPode,
} from "@/lib/supabase/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { buscarProcesso } from "@/lib/db/processos";
import { listarAndamentosDoProcesso } from "@/lib/db/andamentos";
import { FioTramitacao } from "@/components/FioTramitacao";
import { postarAndamentoNoProcesso } from "./acoes";

export default async function PaginaTramitacaoProcesso({
  params,
}: PageProps<"/processos/[id]/tramitacao">) {
  const { id } = await params;

  const sessao = await exigirSessao();
  exigirPermissao(sessao, "tramitacao.ver");
  const podePostar = sessaoPode(sessao, "tramitacao.criar");
  const supabase = await criarClienteServidor();

  const processo = await buscarProcesso(supabase, sessao.escritorioId, id);
  if (!processo) notFound();

  const andamentos = await listarAndamentosDoProcesso(
    supabase,
    sessao.escritorioId,
    id,
  );

  return (
    <div className="flex max-w-[820px] flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Link href={`/processos/${id}`} className="link-acao self-start">
          ← Voltar para o processo
        </Link>
        <h1 className="titulo-pagina">Tramitação</h1>
        <p className="subtitulo-pagina">
          {processo.numero ?? "processo"}
          {processo.pastaCodigo ? ` · ${processo.pastaNome ?? processo.pastaCodigo}` : ""}
        </p>
      </div>

      <FioTramitacao
        andamentos={andamentos}
        podePostar={podePostar}
        acaoPostar={postarAndamentoNoProcesso.bind(null, id)}
      />
    </div>
  );
}
