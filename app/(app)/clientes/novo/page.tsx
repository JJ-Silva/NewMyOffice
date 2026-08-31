import Link from "next/link";
import type { Route } from "next";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { lerRetorno } from "@/lib/navegacao";
import { criarClienteESeguir } from "./acoes";

export default async function PaginaNovoCliente({
  searchParams,
}: PageProps<"/clientes/novo">) {
  const params = await searchParams;
  const erro = typeof params.erro === "string" ? params.erro : null;
  const retorno = lerRetorno(params.retorno);

  return (
    <div className="flex max-w-[520px] flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Link
          href={(retorno ?? "/clientes") as Route}
          className="link-acao self-start"
        >
          {retorno ? "← Voltar" : "← Voltar para clientes"}
        </Link>
        <h1 className="titulo-pagina">Novo cliente</h1>
        <p className="subtitulo-pagina">
          {retorno
            ? "Ao salvar, você volta para onde estava com o cliente já selecionado."
            : "Ao salvar, o fluxo segue direto para a criação da pasta."}
        </p>
      </div>

      {erro && (
        <p className="rounded-lg border border-atrasado bg-[var(--atrasado-fundo)] px-3 py-2 text-sm text-atrasado">
          {erro}
        </p>
      )}

      <form
        action={criarClienteESeguir}
        className="card flex flex-col gap-4 p-6"
      >
        {retorno && <input type="hidden" name="retorno" value={retorno} />}
        <label className="flex flex-col gap-1.5">
          <span className="rotulo">Nome completo / razão social</span>
          <input name="nome" required className="campo" />
        </label>

        <div className="grid gap-4 [grid-template-columns:1fr_180px]">
          <label className="flex flex-col gap-1.5">
            <span className="rotulo">CPF / CNPJ</span>
            <input name="cpf_cnpj" required className="campo" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="rotulo">Tipo</span>
            <select name="tipo_pessoa" className="campo" defaultValue="fisica">
              <option value="fisica">Pessoa física</option>
              <option value="juridica">Pessoa jurídica</option>
            </select>
          </label>
        </div>

        <div className="grid gap-4 [grid-template-columns:1fr_1fr]">
          <label className="flex flex-col gap-1.5">
            <span className="rotulo">Telefone</span>
            <input name="telefone" className="campo" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="rotulo">E-mail</span>
            <input type="email" name="email" className="campo" />
          </label>
        </div>

        <div className="flex gap-3 pt-1">
          <BotaoEnviar rotuloOcupado="Salvando…">
            {retorno ? "Salvar cliente" : "Salvar e criar pasta"}
          </BotaoEnviar>
          <Link
            href={(retorno ?? "/clientes") as Route}
            className="flex h-10 items-center rounded-lg border border-tint-3 bg-white px-4 text-sm font-medium"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
