import { redirect } from "next/navigation";
import { exigirSessao, exigirPermissao } from "@/lib/supabase/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { buscarProcessoGeralDaPasta } from "@/lib/db/processos";

// A tramitação agora é uma tela só (/tramitacao, no menu lateral). Esta rota
// vira atalho: abre o fio da pasta (vista "Caso inteiro") pelo processo geral.
export default async function RedirecionaTramitacaoPasta({
  params,
}: PageProps<"/pastas/[id]/tramitacao">) {
  const { id } = await params;
  const sessao = await exigirSessao();
  exigirPermissao(sessao, "tramitacao.ver");
  const supabase = await criarClienteServidor();
  const geral = await buscarProcessoGeralDaPasta(supabase, sessao.escritorioId, id);
  redirect(geral ? `/tramitacao?processo=${geral}&vista=caso` : "/tramitacao");
}
