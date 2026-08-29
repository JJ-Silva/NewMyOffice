import Link from "next/link";
import { criarConta } from "./acoes";

export default async function PaginaCadastro({
  searchParams,
}: PageProps<"/cadastro">) {
  const params = await searchParams;
  const erro = typeof params.erro === "string" ? params.erro : null;

  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold">Criar escritório</h1>
      <p className="mb-4 text-sm text-texto-secundario">
        O escritório é criado com sua conta como administradora.
      </p>

      {erro && (
        <p className="mb-4 rounded-md border border-atrasado bg-[var(--cor-atrasado-fundo)] px-3 py-2 text-sm text-atrasado">
          {erro}
        </p>
      )}

      <form action={criarConta} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Nome do escritório
          <input
            type="text"
            name="nome_escritorio"
            required
            className="rounded-md border border-tint-2 bg-white px-3 py-2 text-texto"
          />
        </label>

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
            minLength={6}
            autoComplete="new-password"
            className="rounded-md border border-tint-2 bg-white px-3 py-2 text-texto"
          />
        </label>

        <button
          type="submit"
          className="mt-2 rounded-md bg-acento px-3 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Criar escritório
        </button>
      </form>

      <p className="mt-4 text-sm text-texto-secundario">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium text-acento">
          Entrar
        </Link>
      </p>
    </div>
  );
}
