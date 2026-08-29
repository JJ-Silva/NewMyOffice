import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import {
  usuarioLogado,
  COOKIE_ESCRITORIO_ATIVO,
} from "@/lib/supabase/sessao";
import { listarMembrosDoUsuario } from "@/lib/db/membros";
import { trocarEscritorio } from "./acoes";

export default async function PaginaTrocarEscritorio() {
  const usuario = await usuarioLogado();
  if (!usuario) {
    redirect("/login");
  }

  const supabase = await criarClienteServidor();
  const membros = await listarMembrosDoUsuario(supabase, usuario.id);
  const ativoId = (await cookies()).get(COOKIE_ESCRITORIO_ATIVO)?.value;

  return (
    <div>
      <h1 className="mb-1.5 text-2xl font-semibold tracking-[-0.02em]">
        Trocar de escritório
      </h1>
      <p className="mb-[26px] text-sm leading-[1.55] text-texto-secundario">
        Escolha o escritório com o qual quer trabalhar agora.
      </p>

      <ul className="flex flex-col gap-2">
        {membros.map((m) => {
          const ehAtivo = m.escritorio_id === ativoId;
          return (
            <li key={m.escritorio_id}>
              <form action={trocarEscritorio}>
                <input
                  type="hidden"
                  name="escritorio_id"
                  value={m.escritorio_id}
                />
                <button
                  type="submit"
                  disabled={ehAtivo}
                  className="flex w-full items-center justify-between rounded-lg border border-tint-2 bg-white px-3 py-2.5 text-left text-sm hover:border-teal disabled:opacity-60"
                >
                  <span>
                    {m.escritorio_nome}
                    <span className="ml-2 text-xs text-texto-secundario">
                      {m.papel}
                    </span>
                  </span>
                  {ehAtivo && <span className="text-xs text-teal">ativo</span>}
                </button>
              </form>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-[13px]">
        <Link href="/agenda">Voltar para a agenda</Link>
      </p>
    </div>
  );
}
