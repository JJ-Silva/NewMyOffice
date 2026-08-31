import Link from "next/link";
import { exigirSessao } from "@/lib/supabase/sessao";

// Rota neutra para onde `exigirPermissao` manda quem não tem acesso a uma área.
// Não tem guard de permissão (senão viraria loop de redirect).
export default async function PaginaSemAcesso() {
  const sessao = await exigirSessao();

  return (
    <div className="mx-auto flex max-w-[560px] flex-col gap-4 pt-10">
      <h1 className="titulo-pagina">Sem acesso a essa área</h1>
      <p className="text-[14px] text-texto-secundario">
        Seu rótulo{" "}
        {sessao.membro.rotulo_nome ? (
          <strong>({sessao.membro.rotulo_nome})</strong>
        ) : null}{" "}
        não tem permissão para abrir a página que você tentou acessar. Se você
        precisa desse acesso, fale com quem administra o escritório{" "}
        <strong>{sessao.escritorioNome}</strong>.
      </p>
      <div className="flex gap-2">
        <Link href="/agenda" className="botao-secundario">
          Ir para a agenda
        </Link>
        <Link href="/trocar-escritorio" className="link-acao self-center">
          Trocar de escritório
        </Link>
      </div>
    </div>
  );
}
