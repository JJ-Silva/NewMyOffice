import Link from "next/link";
import { notFound } from "next/navigation";
import {
  exigirSessao,
  exigirPermissao,
  sessaoPode,
} from "@/lib/supabase/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { buscarCliente } from "@/lib/db/clientes";
import { formatarCpfCnpj } from "@/lib/domain/documento";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { salvarCliente, excluirClienteAction } from "./acoes";

const STATUS_LABEL: Record<string, string> = {
  ativa: "Ativa",
  arquivada: "Arquivada",
  suspensa: "Suspensa",
};

export default async function PaginaCliente({
  params,
  searchParams,
}: PageProps<"/clientes/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const erro = typeof sp.erro === "string" ? sp.erro : null;
  const salvo = sp.salvo === "1";

  const sessao = await exigirSessao();
  exigirPermissao(sessao, "clientes.ver");
  const podeEditar = sessaoPode(sessao, "clientes.editar");
  const podeExcluir = sessaoPode(sessao, "clientes.excluir");
  const podeCriarPasta = sessaoPode(sessao, "pastas.criar");

  const supabase = await criarClienteServidor();
  const cliente = await buscarCliente(supabase, sessao.escritorioId, id);
  if (!cliente) notFound();

  return (
    <div className="flex max-w-[720px] flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Link href="/clientes" className="link-acao self-start">
          ← Voltar para clientes
        </Link>
        <span className="text-xs text-texto-secundario">
          {cliente.tipo_pessoa === "fisica"
            ? "Pessoa física"
            : "Pessoa jurídica"}{" "}
          · {formatarCpfCnpj(cliente.cpf_cnpj)}
        </span>
        <h1 className="titulo-pagina">{cliente.nome}</h1>
      </div>

      {erro && (
        <p className="rounded-lg border border-atrasado bg-[var(--atrasado-fundo)] px-3 py-2 text-sm text-atrasado">
          {erro}
        </p>
      )}
      {salvo && (
        <p className="rounded-lg border border-cumprido bg-[#F0FDF4] px-3.5 py-2.5 text-sm text-[#166534]">
          Cliente salvo.
        </p>
      )}

      {podeEditar ? (
        <form action={salvarCliente} className="card flex flex-col gap-4 p-6">
          <input type="hidden" name="id" value={cliente.id} />
          <span className="text-sm font-semibold">Dados do cliente</span>

          <label className="flex flex-col gap-1.5">
            <span className="rotulo">Nome completo / razão social</span>
            <input
              name="nome"
              required
              defaultValue={cliente.nome}
              className="campo"
            />
          </label>

          <div className="grid gap-4 [grid-template-columns:1fr_180px]">
            <label className="flex flex-col gap-1.5">
              <span className="rotulo">CPF / CNPJ</span>
              <input
                name="cpf_cnpj"
                required
                defaultValue={formatarCpfCnpj(cliente.cpf_cnpj)}
                className="campo"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="rotulo">Tipo</span>
              <select
                name="tipo_pessoa"
                defaultValue={cliente.tipo_pessoa}
                className="campo"
              >
                <option value="fisica">Pessoa física</option>
                <option value="juridica">Pessoa jurídica</option>
              </select>
            </label>
          </div>

          <div className="grid gap-4 [grid-template-columns:1fr_1fr]">
            <label className="flex flex-col gap-1.5">
              <span className="rotulo">Telefone</span>
              <input
                name="telefone"
                defaultValue={cliente.telefone ?? ""}
                className="campo"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="rotulo">E-mail</span>
              <input
                type="email"
                name="email"
                defaultValue={cliente.email ?? ""}
                className="campo"
              />
            </label>
          </div>

          <BotaoEnviar
            className="botao-primario h-[38px] self-start"
            rotuloOcupado="Salvando…"
          >
            Salvar cliente
          </BotaoEnviar>
        </form>
      ) : (
        <div className="card flex flex-col gap-2 p-6 text-[13.5px]">
          <span className="text-sm font-semibold">Dados do cliente</span>
          <span>Telefone: {cliente.telefone ?? "—"}</span>
          <span>E-mail: {cliente.email ?? "—"}</span>
          <span className="text-xs text-texto-secundario">
            Seu rótulo pode ver, mas não editar clientes.
          </span>
        </div>
      )}

      <div className="card flex flex-col gap-3 p-6">
        <span className="text-sm font-semibold">
          Pastas ({cliente.pastas.length})
        </span>
        {cliente.pastas.length === 0 ? (
          <p className="text-[13px] text-texto-secundario">
            Este cliente ainda não tem pastas.
          </p>
        ) : (
          cliente.pastas.map((p) => (
            <div key={p.id} className="linha-lista">
              <Link
                href={`/pastas/${p.id}`}
                className="flex-1 text-[13.5px] font-medium text-texto hover:text-teal hover:no-underline"
              >
                {p.nome ?? p.codigo}
              </Link>
              <span className="text-xs text-texto-secundario">
                {p.codigo} · {STATUS_LABEL[p.status] ?? p.status}
              </span>
            </div>
          ))
        )}
        {podeCriarPasta && (
          <Link
            href={`/pastas/nova?cliente=${cliente.id}`}
            className="botao-secundario self-start"
          >
            + Nova pasta para este cliente
          </Link>
        )}
      </div>

      {podeExcluir && (
        <details className="text-sm">
          <summary className="cursor-pointer text-texto-secundario">
            Excluir este cliente
          </summary>
          {cliente.pastas.length > 0 ? (
            <p className="mt-2 text-[13px] text-texto-secundario">
              Não dá para excluir: o cliente está em{" "}
              {cliente.pastas.length} pasta
              {cliente.pastas.length === 1 ? "" : "s"}. Trate essas pastas antes.
            </p>
          ) : (
            <form
              action={excluirClienteAction}
              className="mt-2 flex items-end gap-2"
            >
              <input type="hidden" name="id" value={cliente.id} />
              <label className="flex flex-col gap-1.5">
                <span className="rotulo">
                  Some das listas (soft-delete). Digite <strong>EXCLUIR</strong>.
                </span>
                <input
                  name="confirmacao"
                  required
                  placeholder="EXCLUIR"
                  className="campo w-[220px]"
                />
              </label>
              <BotaoEnviar className="botao-perigo h-[38px]" rotuloOcupado="…">
                Excluir cliente
              </BotaoEnviar>
            </form>
          )}
        </details>
      )}
    </div>
  );
}
