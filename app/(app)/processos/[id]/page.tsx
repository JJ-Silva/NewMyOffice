import Link from "next/link";
import { notFound } from "next/navigation";
import {
  exigirSessao,
  exigirPermissao,
  sessaoPode,
} from "@/lib/supabase/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { buscarProcesso } from "@/lib/db/processos";
import { listarTribunais } from "@/lib/db/tribunais";
import {
  FormularioJudicial,
  FormularioAdministrativo,
} from "./formularios-edicao";

export default async function PaginaEditarProcesso({
  params,
  searchParams,
}: PageProps<"/processos/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const erro = typeof sp.erro === "string" ? sp.erro : null;

  const sessao = await exigirSessao();
  exigirPermissao(sessao, "processos.ver");
  const podeEditar = sessaoPode(sessao, "processos.editar");
  const podeExcluir = sessaoPode(sessao, "processos.excluir");
  const supabase = await criarClienteServidor();
  const processo = await buscarProcesso(supabase, sessao.escritorioId, id);
  if (!processo) notFound();

  return (
    <div className="flex max-w-[860px] flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Link href="/processos" className="link-acao self-start">
          ← Voltar para processos
        </Link>
        <span className="text-xs text-texto-secundario">
          {processo.tipo === "judicial"
            ? "Processo judicial"
            : processo.tipo === "administrativo"
              ? "Processo administrativo"
              : "Processo"}{" "}
          · {processo.pastaNome ?? processo.pastaCodigo} ·{" "}
          {processo.clienteNome ?? "sem cliente"}
        </span>
        <h1 className="titulo-pagina">
          {processo.numero ?? "Editar processo"}
        </h1>
      </div>

      {erro && (
        <p className="rounded-lg border border-atrasado bg-[var(--atrasado-fundo)] px-3 py-2 text-sm text-atrasado">
          {erro}
        </p>
      )}

      {processo.tipo === "geral" ? (
        <div className="painel-vazio">
          O processo “geral” é o trabalho da pasta sem número — não tem o que
          editar aqui. Cadastre um processo judicial ou administrativo pela
          pasta.
        </div>
      ) : processo.tipo === "judicial" ? (
        <FormularioJudicial
          processo={processo}
          tribunais={await listarTribunais(supabase, sessao.escritorioId)}
          podeEditar={podeEditar}
          podeExcluir={podeExcluir}
        />
      ) : (
        <FormularioAdministrativo
          processo={processo}
          podeEditar={podeEditar}
          podeExcluir={podeExcluir}
        />
      )}
    </div>
  );
}
