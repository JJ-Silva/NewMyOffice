// Helpers de sessão: quem está logado, qual é o escritório ativo, o vínculo
// (membro) do usuário com esse escritório e as permissões efetivas dele.
//
// "Escritório ativo": um usuário pode ser membro de vários escritórios. A
// escolha atual fica num cookie. Toda query de dados usa esse escritorio_id.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import {
  listarMembrosDoUsuario,
  carregarPermissoesDoMembro,
  type Membro,
} from "@/lib/db/membros";
import type { Permissao } from "@/lib/domain/permissoes";

export const COOKIE_ESCRITORIO_ATIVO = "myoffice_escritorio_ativo";

const UM_ANO_EM_SEGUNDOS = 60 * 60 * 24 * 365;

export type UsuarioLogado = {
  id: string;
  email: string;
  nome: string;
};

export type Sessao = {
  usuario: UsuarioLogado;
  escritorioId: string;
  escritorioNome: string;
  membro: Membro;
  fundador: boolean;
  // permissões já resolvidas (rótulo + overrides) — para a UI decidir o que mostrar
  permissoes: Set<Permissao>;
};

// O usuário autenticado (ou null). Usa getUser() — valida o token no servidor.
export async function usuarioLogado(): Promise<UsuarioLogado | null> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email ?? "",
    nome:
      (user.user_metadata?.nome as string | undefined)?.trim() ||
      (user.email ?? ""),
  };
}

// Grava o escritório ativo no cookie. Só funciona em Server Action / Route Handler.
export async function definirEscritorioAtivo(escritorioId: string): Promise<void> {
  const armazem = await cookies();
  armazem.set(COOKIE_ESCRITORIO_ATIVO, escritorioId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: UM_ANO_EM_SEGUNDOS,
  });
}

// Resolve a sessão completa: usuário + escritório ativo + membro + permissões.
// Regra de escolha do escritório:
//   1. o do cookie, se o usuário ainda for membro ativo dele;
//   2. senão, o primeiro escritório do usuário;
//   3. se o usuário não tem nenhum escritório → null (precisa de onboarding).
export async function sessaoAtual(): Promise<Sessao | null> {
  const usuario = await usuarioLogado();
  if (!usuario) {
    return null;
  }

  const supabase = await criarClienteServidor();
  const armazem = await cookies();
  const escritorioDoCookie = armazem.get(COOKIE_ESCRITORIO_ATIVO)?.value;

  const membros = await listarMembrosDoUsuario(supabase, usuario.id);
  if (membros.length === 0) {
    return null;
  }

  // 1º: o escritório do cookie, se o usuário ainda for membro dele.
  // 2º: o primeiro escritório do usuário.
  const escolhido =
    (escritorioDoCookie &&
      membros.find((m) => m.escritorio_id === escritorioDoCookie)) ||
    membros[0];

  const membro: Membro = {
    id: escolhido.id,
    escritorio_id: escolhido.escritorio_id,
    ativo: escolhido.ativo,
    fundador: escolhido.fundador,
    rotulo_id: escolhido.rotulo_id,
    rotulo_nome: escolhido.rotulo_nome,
  };

  const permissoes = await carregarPermissoesDoMembro(supabase, membro);

  return {
    usuario,
    escritorioId: escolhido.escritorio_id,
    escritorioNome: escolhido.escritorio_nome,
    membro,
    fundador: membro.fundador,
    permissoes,
  };
}

// Para páginas protegidas: exige sessão; redireciona se faltar.
// - sem login  → /login
// - logado mas sem escritório → /cadastro (fluxo de onboarding)
export async function exigirSessao(): Promise<Sessao> {
  const usuario = await usuarioLogado();
  if (!usuario) {
    redirect("/login");
  }

  const sessao = await sessaoAtual();
  if (!sessao) {
    redirect("/cadastro");
  }

  return sessao;
}

// ── Checagem de permissão a partir da sessão ────────────────────────────────
// Fundador pode tudo; senão, olha o conjunto já resolvido.
export function sessaoPode(sessao: Sessao, permissao: Permissao): boolean {
  return sessao.fundador || sessao.permissoes.has(permissao);
}

// Para guards de página / Server Action: aborta (redirect) se não puder.
// Manda para /sem-acesso (rota neutra — não tem guard, evita loop de redirect).
export function exigirPermissao(sessao: Sessao, permissao: Permissao): void {
  if (!sessaoPode(sessao, permissao)) {
    redirect("/sem-acesso");
  }
}

// Configurações agrupa várias áreas com permissões distintas. Aparece no menu
// (e a rota abre) se o membro puder mexer em qualquer uma delas.
const PERMISSOES_DE_CONFIGURACAO: Permissao[] = [
  "config.tribunais",
  "config.catalogos",
  "config.escritorio",
  "membros.gerenciar",
  "rotulos.gerenciar",
  "oab.gerenciar",
];

export function podeAbrirConfiguracoes(sessao: Sessao): boolean {
  return (
    sessao.fundador ||
    PERMISSOES_DE_CONFIGURACAO.some((p) => sessao.permissoes.has(p))
  );
}
