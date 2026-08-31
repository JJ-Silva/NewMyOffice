import Link from "next/link";
import type { Route } from "next";
import { criarClienteServidor } from "@/lib/supabase/server";
import { usuarioLogado } from "@/lib/supabase/sessao";
import { verConvite } from "@/lib/db/convites";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { CampoSenha } from "@/components/CampoSenha";
import { sair } from "@/app/(app)/acoes";
import { aceitar, criarContaEAceitar } from "./acoes";

export default async function PaginaConvite({
  params,
  searchParams,
}: PageProps<"/convite/[token]">) {
  const { token } = await params;
  const sp = await searchParams;
  const erro = typeof sp.erro === "string" ? sp.erro : null;

  const supabase = await criarClienteServidor();
  const convite = await verConvite(supabase, token);
  const usuario = await usuarioLogado();

  if (!convite) {
    return (
      <Aviso titulo="Convite não encontrado">
        O link pode estar incorreto ou o convite foi removido. Peça um novo ao
        escritório.
      </Aviso>
    );
  }
  if (convite.status === "aceito") {
    return (
      <Aviso titulo="Convite já aceito">
        Este convite já foi usado.{" "}
        <Link href="/login">Entrar na sua conta</Link>.
      </Aviso>
    );
  }
  if (convite.status === "cancelado") {
    return (
      <Aviso titulo="Convite cancelado">
        O escritório cancelou este convite.
      </Aviso>
    );
  }
  if (convite.expirado) {
    return (
      <Aviso titulo="Convite expirado">
        Este convite passou da validade. Peça um novo ao escritório.
      </Aviso>
    );
  }

  const comoRotulo = convite.rotuloNome ? ` como ${convite.rotuloNome}` : "";

  // ── Ainda não entrou ─────────────────────────────────────────────────────
  if (!usuario) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">
          Convite para {convite.escritorioNome}
        </h1>
        <p className="text-sm leading-[1.55] text-texto-secundario">
          Você foi convidado{comoRotulo}. Crie sua conta para entrar:
        </p>

        {erro && (
          <p className="rounded-lg border border-atrasado bg-[var(--atrasado-fundo)] px-3 py-2 text-sm text-atrasado">
            {erro}
          </p>
        )}

        <form action={criarContaEAceitar} className="flex flex-col gap-4">
          <input type="hidden" name="token" value={token} />
          <label className="flex flex-col gap-1.5">
            <span className="rotulo">Como devo te chamar?</span>
            <input
              type="text"
              name="nome"
              required
              autoComplete="name"
              placeholder="Seu nome"
              className="campo h-10"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="rotulo">E-mail</span>
            <input
              type="email"
              name="email"
              readOnly
              value={convite.email}
              className="campo h-10 bg-tint-1 text-texto-secundario"
            />
          </label>
          <CampoSenha
            name="senha"
            label="Crie uma senha"
            minLength={6}
            placeholder="pelo menos 6 caracteres"
          />
          <CampoSenha name="confirmar" label="Repita a senha" minLength={6} />
          <BotaoEnviar
            className="botao-primario h-[42px]"
            rotuloOcupado="Criando…"
          >
            Criar conta e entrar
          </BotaoEnviar>
        </form>

        <p className="text-[13px] text-texto-secundario">
          Já tem conta?{" "}
          <Link
            href={
              `/login?next=${encodeURIComponent(`/convite/${token}`)}` as Route
            }
          >
            Entrar
          </Link>
        </p>
      </div>
    );
  }

  // ── Entrou com o e-mail errado ───────────────────────────────────────────
  if (usuario.email.toLowerCase() !== convite.email.toLowerCase()) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">
          Convite para outro e-mail
        </h1>
        <p className="text-sm leading-[1.55] text-texto-secundario">
          Você está na conta <strong>{usuario.email}</strong>, mas este convite é
          para <strong>{convite.email}</strong>. Saia e entre com a conta certa.
        </p>
        <form action={sair}>
          <button type="submit" className="botao-secundario h-[42px]">
            Sair
          </button>
        </form>
      </div>
    );
  }

  // ── Pronto para aceitar ──────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-[-0.02em]">
        Entrar no escritório {convite.escritorioNome}
      </h1>
      <p className="text-sm leading-[1.55] text-texto-secundario">
        Você entra{comoRotulo}, na conta {usuario.email}.
      </p>

      {erro && (
        <p className="rounded-lg border border-atrasado bg-[var(--atrasado-fundo)] px-3 py-2 text-sm text-atrasado">
          {erro}
        </p>
      )}

      <form action={aceitar} className="flex flex-col gap-3">
        <input type="hidden" name="token" value={token} />
        <BotaoEnviar
          className="botao-primario h-[42px] self-start"
          rotuloOcupado="Aceitando…"
        >
          Aceitar convite
        </BotaoEnviar>
      </form>
    </div>
  );
}

function Aviso({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-2xl font-semibold tracking-[-0.02em]">{titulo}</h1>
      <p className="text-sm leading-[1.55] text-texto-secundario">{children}</p>
    </div>
  );
}
