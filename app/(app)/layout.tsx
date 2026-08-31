// Layout das telas internas (protegidas). Exige sessão e desenha o shell
// com a sidebar teal (porte do protótipo).

import { exigirSessao, podeAbrirConfiguracoes } from "@/lib/supabase/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { contarPublicacoesNovas } from "@/lib/db/publicacoes";
import { Sidebar } from "@/components/Sidebar";

export default async function LayoutApp({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessao = await exigirSessao();
  const supabase = await criarClienteServidor();

  // Badge de "publicações novas para triar" na sidebar.
  let publicacoesNovas = 0;
  try {
    publicacoesNovas = await contarPublicacoesNovas(
      supabase,
      sessao.escritorioId,
    );
  } catch {
    // a contagem é só um enfeite — não derruba o app
  }

  return (
    <div className="app-shell">
      <Sidebar
        usuarioNome={sessao.usuario.nome}
        escritorioNome={sessao.escritorioNome}
        mostrarConfiguracoes={podeAbrirConfiguracoes(sessao)}
        permissoes={[...sessao.permissoes]}
        fundador={sessao.fundador}
        publicacoesNovas={publicacoesNovas}
      />
      <main className="sidebar-conteudo">{children}</main>
    </div>
  );
}
