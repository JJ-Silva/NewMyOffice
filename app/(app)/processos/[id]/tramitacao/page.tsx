import { redirect } from "next/navigation";

// A tramitação agora é uma tela só (/tramitacao, no menu lateral). Esta rota
// vira atalho: abre o fio deste processo (vista "Este processo").
export default async function RedirecionaTramitacaoProcesso({
  params,
}: PageProps<"/processos/[id]/tramitacao">) {
  const { id } = await params;
  redirect(`/tramitacao?processo=${id}&vista=processo`);
}
