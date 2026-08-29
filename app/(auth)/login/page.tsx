import Link from "next/link";
import { entrar } from "./acoes";

export default async function PaginaLogin({
  searchParams,
}: PageProps<"/login">) {
  const params = await searchParams;
  const erro = typeof params.erro === "string" ? params.erro : null;

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold">Entrar</h1>

      {erro && (
        <p className="mb-4 rounded-md border border-atrasado bg-[var(--cor-atrasado-fundo)] px-3 py-2 text-sm text-atrasado">
          {erro}
        </p>
      )}

      <form action={entrar} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          E-mail
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="rounded-md border border-tint-2 bg-white px-3 py-2 text-texto"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Senha
          <input
            type="password"
            name="senha"
            required
            autoComplete="current-password"
            className="rounded-md border border-tint-2 bg-white px-3 py-2 text-texto"
          />
        </label>

        <button
          type="submit"
          className="mt-2 rounded-md bg-acento px-3 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Entrar
        </button>
      </form>

      <p className="mt-4 text-sm text-texto-secundario">
        Não tem conta?{" "}
        <Link href="/cadastro" className="font-medium text-acento">
          Criar escritório
        </Link>
      </p>
    </div>
  );
}
