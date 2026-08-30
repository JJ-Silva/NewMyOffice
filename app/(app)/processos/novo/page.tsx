import Link from "next/link";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { exigirSessao } from "@/lib/supabase/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { listarPastas } from "@/lib/db/pastas";
import { listarTribunais } from "@/lib/db/tribunais";
import { FormularioJudicial } from "./formulario-judicial";
import { FormularioAdministrativo } from "./formulario-administrativo";

export default async function PaginaNovoProcesso({
  searchParams,
}: PageProps<"/processos/novo">) {
  const sessao = await exigirSessao();
  const supabase = await criarClienteServidor();
  const params = await searchParams;

  const get = (k: string) => {
    const v = params[k];
    return typeof v === "string" ? v : "";
  };
  const tipo = get("tipo") === "administrativo" ? "administrativo" : "judicial";
  const erro = get("erro") || null;

  const pastas = await listarPastas(supabase, sessao.escritorioId);
  if (pastas.length === 0) {
    redirect("/clientes/novo");
  }

  // eco dos campos preenchidos (o form judicial re-renderiza no GET)
  const valores: Record<string, string> = {};
  for (const k of [
    "pasta",
    "cnj",
    "tribunal",
    "vara",
    "comarca",
    "fase",
    "polo",
    "valor_causa",
    "data_distribuicao",
    "publicacao", // Etapa 5: veio da triagem de uma publicação do DJEN
  ]) {
    const v = get(k);
    if (v) valores[k] = v;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Link href="/processos" className="link-acao self-start">
          ← Voltar para processos
        </Link>
        <h1 className="titulo-pagina">Cadastrar processo</h1>
      </div>

      <div className="abas max-w-[360px]">
        <Link
          href={"/processos/novo?tipo=judicial" as Route}
          className="aba"
          data-ativa={tipo === "judicial"}
        >
          Judicial
        </Link>
        <Link
          href={"/processos/novo?tipo=administrativo" as Route}
          className="aba"
          data-ativa={tipo === "administrativo"}
        >
          Administrativo
        </Link>
      </div>

      {tipo === "judicial" ? (
        <FormularioJudicial
          pastas={pastas}
          tribunais={await listarTribunais(supabase, sessao.escritorioId)}
          valores={valores}
          erro={erro}
        />
      ) : (
        <FormularioAdministrativo
          pastas={pastas}
          valores={valores}
          erro={erro}
        />
      )}
    </div>
  );
}
