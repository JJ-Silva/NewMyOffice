import Link from "next/link";
import { AbasAuth } from "../abas";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { entrar } from "./acoes";

export default async function PaginaLogin({
  searchParams,
}: PageProps<"/login">) {
  const params = await searchParams;
  const erro = typeof params.erro === "string" ? params.erro : null;
  const next = typeof params.next === "string" ? params.next : "";

  return (
    <div>
      <AbasAuth ativa="login" />

      <h1 className="mb-1.5 text-2xl font-semibold tracking-[-0.02em]">
        Bem-vindo de volta
      </h1>
      <p className="mb-[26px] text-sm leading-[1.55] text-texto-secundario">
        Acesse a agenda de atividades do escritório.
      </p>

      {erro && (
        <p className="mb-4 rounded-lg border border-atrasado bg-[var(--atrasado-fundo)] px-3 py-2 text-sm text-atrasado">
          {erro}
        </p>
      )}

      {next && (
        <p className="mb-4 rounded-lg border border-tint-2 bg-tint-1 px-3 py-2 text-[13px] text-texto-secundario">
          Entre para continuar.
        </p>
      )}

      <form action={entrar} className="flex flex-col gap-4">
        {next && <input type="hidden" name="next" value={next} />}
        <label className="flex flex-col gap-1.5">
          <span className="rotulo">E-mail</span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="voce@escritorio.adv.br"
            className="campo h-10"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="rotulo">Senha</span>
          <input
            type="password"
            name="senha"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className="campo h-10"
          />
        </label>

        <BotaoEnviar className="botao-primario mt-1 h-[42px]" rotuloOcupado="Entrando…">
          Entrar
        </BotaoEnviar>
      </form>

      <p className="mt-4 text-center text-[13px]">
        <Link href="/cadastro">Criar escritório</Link>
      </p>
    </div>
  );
}
