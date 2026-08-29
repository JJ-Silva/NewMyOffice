# lib/supabase — clients e sessão

- `browser.ts` — `criarClienteBrowser()` para Client Components.
- `server.ts` — `criarClienteServidor()` para Server Components / Server Actions (lê a sessão dos cookies).
- `proxy.ts` — `atualizarSessao(request)`: renova o token no `proxy.ts` da raiz (o antigo "middleware" do Next) e redireciona login/rota protegida.
- `sessao.ts` — helpers:
  - `usuarioLogado()` — o usuário autenticado (ou null).
  - `sessaoAtual()` — usuário + escritório ativo + `membro`.
  - `exigirSessao()` — para páginas protegidas; redireciona se faltar sessão/escritório.
  - `definirEscritorioAtivo(id)` — grava o escritório ativo no cookie `myoffice_escritorio_ativo`.

Autorização (`podeFazer`) fica em `lib/domain/autorizacao.ts` (regra pura).

Criado no Passo 3 do `INICIO-AQUI.md` (auth + onboarding).
