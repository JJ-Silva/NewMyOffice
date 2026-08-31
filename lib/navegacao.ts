// Encadeamento de cadastros ("retorno").
//
// Quando uma tela de cadastro precisa que você crie outra coisa antes (ex.:
// "Nova pasta" sem nenhum cliente cadastrado), ela leva a própria URL como
// `?retorno=…`. Ao salvar, a Server Action volta para essa URL com o id novo
// anexado — automático, sem "voltar" manual.
//
// Regras:
//  - só caminhos internos (começam com "/", não "//") — anti open-redirect
//  - o menu não passa `retorno`, então navegar pelo menu zera a cadeia
//  - cada tela conhece só o seu passo anterior (sem trilha de migalhas)

type ValorParam = string | string[] | undefined;

// Lê e valida o `retorno` de um objeto de searchParams já resolvido.
export function lerRetorno(valor: ValorParam): string | null {
  const s = typeof valor === "string" ? valor.trim() : "";
  if (!s.startsWith("/")) return null;
  if (s.startsWith("//") || s.startsWith("/\\")) return null;
  return s;
}

// Reconstrói a URL da tela atual (path + os searchParams que vieram na URL).
export function urlDaTela(
  path: string,
  params: Record<string, ValorParam>,
): string {
  const sp = new URLSearchParams();
  for (const [chave, valor] of Object.entries(params)) {
    // `erro` é transitório — não deve viajar no retorno
    if (chave !== "erro" && typeof valor === "string") sp.set(chave, valor);
  }
  const query = sp.toString();
  return query ? `${path}?${query}` : path;
}

// Link para "criar X" a partir da tela atual, carregando o retorno.
export function comRetorno(destino: string, urlAtual: string): string {
  const sep = destino.includes("?") ? "&" : "?";
  return `${destino}${sep}retorno=${encodeURIComponent(urlAtual)}`;
}

// Anexa ?chave=valor (o id recém-criado) à URL de retorno.
export function anexarId(retorno: string, chave: string, id: string): string {
  const sep = retorno.includes("?") ? "&" : "?";
  return `${retorno}${sep}${chave}=${encodeURIComponent(id)}`;
}
