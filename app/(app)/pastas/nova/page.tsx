import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { exigirSessao, exigirPermissao } from "@/lib/supabase/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { listarClientes } from "@/lib/db/clientes";
import { listarAreas } from "@/lib/db/areas";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { lerRetorno, urlDaTela, comRetorno } from "@/lib/navegacao";
import { criarPastaAction } from "./acoes";

export default async function PaginaNovaPasta({
  searchParams,
}: PageProps<"/pastas/nova">) {
  const sessao = await exigirSessao();
  exigirPermissao(sessao, "pastas.criar");
  const params = await searchParams;
  const erro = typeof params.erro === "string" ? params.erro : null;
  const clientePreSelecionado =
    typeof params.cliente === "string" ? params.cliente : "";
  const retorno = lerRetorno(params.retorno);
  const urlAtual = urlDaTela("/pastas/nova", params);

  const supabase = await criarClienteServidor();
  const [clientes, areas] = await Promise.all([
    listarClientes(supabase, sessao.escritorioId),
    listarAreas(supabase, sessao.escritorioId),
  ]);

  // Sem nenhum cliente → manda cadastrar um, voltando pra cá depois.
  if (clientes.length === 0) {
    redirect(comRetorno("/clientes/novo", urlAtual));
  }

  return (
    <div className="flex max-w-[560px] flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Link
          href={(retorno ?? "/pastas") as Route}
          className="link-acao self-start"
        >
          {retorno ? "← Voltar" : "← Voltar para pastas"}
        </Link>
        <h1 className="titulo-pagina">Nova pasta</h1>
        <p className="subtitulo-pagina">
          O código (AAAA/NNNNNN) é gerado automaticamente. A pasta já nasce com
          um processo “geral”.
        </p>
      </div>

      {erro && (
        <p className="rounded-lg border border-atrasado bg-[var(--atrasado-fundo)] px-3 py-2 text-sm text-atrasado">
          {erro}
        </p>
      )}

      <form action={criarPastaAction} className="card flex flex-col gap-4 p-6">
        {retorno && <input type="hidden" name="retorno" value={retorno} />}

        <label className="flex flex-col gap-1.5">
          <span className="flex items-center justify-between">
            <span className="rotulo">Cliente</span>
            <Link
              href={comRetorno("/clientes/novo", urlAtual) as Route}
              className="text-xs font-medium text-teal hover:underline"
            >
              + cadastrar cliente
            </Link>
          </span>
          <select
            name="cliente_id"
            required
            defaultValue={clientePreSelecionado}
            className="campo"
          >
            <option value="" disabled>
              Selecione o cliente…
            </option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome} — {c.cpf_cnpj}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="rotulo">Nome da pasta (opcional)</span>
          <input
            name="nome"
            placeholder="Ex.: Silva x Banco Cruzeiro"
            className="campo"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="rotulo">Área</span>
          <select name="area_id" className="campo" defaultValue="">
            <option value="">— sem área —</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="rotulo">Objetivo (o que se busca) — opcional</span>
          <input name="objetivo" className="campo" />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="rotulo">Objeto (sobre o que é) — opcional</span>
          <input name="objeto" className="campo" />
        </label>

        <div className="flex gap-3 pt-1">
          <BotaoEnviar rotuloOcupado="Criando…">
            {retorno ? "Salvar pasta" : "Criar pasta"}
          </BotaoEnviar>
          <Link
            href={(retorno ?? "/pastas") as Route}
            className="flex h-10 items-center rounded-lg border border-tint-3 bg-white px-4 text-sm font-medium"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
