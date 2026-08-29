// Layout das telas internas (protegidas). Exige sessão e mostra a barra
// superior com escritório ativo, usuário e ações. Na Etapa 1 a navegação
// lateral completa (agenda, clientes, pastas, configurações) entra nos
// passos seguintes do INICIO-AQUI.md.

import Link from "next/link";
import { exigirSessao } from "@/lib/supabase/sessao";
import { podeFazer } from "@/lib/domain/autorizacao";
import { sair } from "./acoes";

export default async function LayoutApp({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessao = await exigirSessao();
  const mostrarConfiguracoes = podeFazer(
    sessao.membro,
    "acessar_configuracoes",
  );

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between border-b border-tint-2 bg-superficie px-6 py-3">
        <div className="flex items-center gap-4">
          <Link
            href="/agenda"
            className="text-lg font-semibold tracking-tight text-acento"
          >
            MyOffice
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/agenda" className="text-texto-secundario hover:text-texto">
              Agenda
            </Link>
            {mostrarConfiguracoes && (
              <Link
                href="/configuracoes"
                className="text-texto-secundario hover:text-texto"
              >
                Configurações
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <span className="text-texto-secundario">
            {sessao.usuario.nome} · {sessao.escritorioNome}
          </span>
          <Link href="/trocar-escritorio" className="text-acento">
            Trocar
          </Link>
          <form action={sair}>
            <button type="submit" className="text-acento">
              Sair
            </button>
          </form>
        </div>
      </header>

      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
