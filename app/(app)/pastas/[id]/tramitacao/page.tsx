import Link from "next/link";
import { notFound } from "next/navigation";
import {
  exigirSessao,
  exigirPermissao,
  sessaoPode,
} from "@/lib/supabase/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { buscarPasta } from "@/lib/db/pastas";
import {
  listarProcessos,
  buscarProcessoGeralDaPasta,
} from "@/lib/db/processos";
import { listarAndamentosDaPasta } from "@/lib/db/andamentos";
import { FioTramitacao } from "@/components/FioTramitacao";
import { postarAndamentoNaPasta } from "./acoes";

export default async function PaginaTramitacaoPasta({
  params,
}: PageProps<"/pastas/[id]/tramitacao">) {
  const { id } = await params;

  const sessao = await exigirSessao();
  exigirPermissao(sessao, "tramitacao.ver");
  const podePostar = sessaoPode(sessao, "tramitacao.criar");
  const supabase = await criarClienteServidor();

  const pasta = await buscarPasta(supabase, sessao.escritorioId, id);
  if (!pasta) notFound();

  const [andamentos, geralId, outros] = await Promise.all([
    listarAndamentosDaPasta(supabase, sessao.escritorioId, id),
    buscarProcessoGeralDaPasta(supabase, sessao.escritorioId, id),
    listarProcessos(supabase, sessao.escritorioId, { pastaId: id }),
  ]);

  // Opções do seletor do rodapé: o "geral" primeiro (default), depois os
  // judiciais/administrativos.
  const processos: { id: string; rotulo: string }[] = [];
  if (geralId) {
    processos.push({ id: geralId, rotulo: `${pasta.nome ?? pasta.codigo} (geral)` });
  }
  for (const p of outros) {
    processos.push({
      id: p.id,
      rotulo: `${p.numero ?? "sem número"} · ${p.tipo === "judicial" ? "judicial" : "administrativo"}`,
    });
  }

  return (
    <div className="flex max-w-[820px] flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Link href={`/pastas/${id}`} className="link-acao self-start">
          ← Voltar para a pasta
        </Link>
        <h1 className="titulo-pagina">Tramitação</h1>
        <p className="subtitulo-pagina">
          {pasta.nome ?? pasta.codigo}
          {pasta.nome ? ` · ${pasta.codigo}` : ""} — todos os processos da pasta
        </p>
      </div>

      <FioTramitacao
        andamentos={andamentos}
        podePostar={podePostar}
        acaoPostar={postarAndamentoNaPasta.bind(null, id)}
        processos={processos}
        mostrarProcesso
      />
    </div>
  );
}
