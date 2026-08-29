// Renovação da sessão no proxy (roda antes de cada rota — o "middleware" do Next,
// renomeado para "proxy" na versão 16).
//
// Por que existe: o token de acesso do Supabase expira em 1h. Server
// Components não podem gravar cookies durante o render, então é aqui que o
// token renovado é escrito de volta na resposta. Sem isto: logout aleatório,
// sessão que cai cedo, erros de parsing de JSON (ver aviso na doc do @supabase/ssr).
//
// Também redireciona: quem não está logado e tenta uma rota protegida vai
// para /login; quem está logado e abre /login ou /cadastro vai para /agenda.

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Rotas que NÃO exigem login.
const ROTAS_PUBLICAS = ["/login", "/cadastro", "/esqueci-senha"];

export async function atualizarSessao(request: NextRequest) {
  let resposta = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesParaGravar: {
            name: string;
            value: string;
            options: CookieOptions;
          }[],
        ) {
          for (const { name, value } of cookiesParaGravar) {
            request.cookies.set(name, value);
          }
          resposta = NextResponse.next({ request });
          for (const { name, value, options } of cookiesParaGravar) {
            resposta.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // NÃO colocar código entre criar o client e getUser() — risco de sessão
  // inconsistente (aviso da doc oficial).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const caminho = request.nextUrl.pathname;
  const ehRotaPublica = ROTAS_PUBLICAS.some(
    (rota) => caminho === rota || caminho.startsWith(rota + "/"),
  );

  // Sem login numa rota protegida → manda para /login.
  if (!user && !ehRotaPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Logado tentando ver login/cadastro → manda para a agenda.
  if (user && (caminho === "/login" || caminho === "/cadastro")) {
    const url = request.nextUrl.clone();
    url.pathname = "/agenda";
    return NextResponse.redirect(url);
  }

  return resposta;
}
