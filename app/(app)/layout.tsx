// Layout das telas internas (protegidas). Exige sessão e desenha o shell
// com a sidebar teal (porte do protótipo).

import { exigirSessao } from "@/lib/supabase/sessao";
import { podeFazer } from "@/lib/domain/autorizacao";
import { Sidebar } from "@/components/Sidebar";

export default async function LayoutApp({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessao = await exigirSessao();

  return (
    <div className="app-shell">
      <Sidebar
        usuarioNome={sessao.usuario.nome}
        escritorioNome={sessao.escritorioNome}
        mostrarConfiguracoes={podeFazer(
          sessao.membro,
          "acessar_configuracoes",
        )}
      />
      <main className="sidebar-conteudo">{children}</main>
    </div>
  );
}
