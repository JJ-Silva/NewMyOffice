import Link from "next/link";
import {
  exigirSessao,
  exigirPermissao,
  sessaoPode,
} from "@/lib/supabase/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { listarClientes } from "@/lib/db/clientes";
import { formatarCpfCnpj } from "@/lib/domain/documento";

export default async function PaginaClientes() {
  const sessao = await exigirSessao();
  exigirPermissao(sessao, "clientes.ver");
  const supabase = await criarClienteServidor();
  const clientes = await listarClientes(supabase, sessao.escritorioId);
  const podeCriarCliente = sessaoPode(sessao, "clientes.criar");
  const podeCriarPasta = sessaoPode(sessao, "pastas.criar");
  const podeEditarCliente = sessaoPode(sessao, "clientes.editar");

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex items-end justify-between gap-5">
        <div className="flex flex-col gap-1.5">
          <h1 className="titulo-pagina">Clientes</h1>
          <p className="subtitulo-pagina">
            {clientes.length} cliente{clientes.length === 1 ? "" : "s"}{" "}
            cadastrado{clientes.length === 1 ? "" : "s"}
          </p>
        </div>
        {podeCriarCliente && (
          <Link href="/clientes/novo" className="botao-primario flex-none">
            + Novo cliente
          </Link>
        )}
      </div>

      {clientes.length === 0 ? (
        <div className="painel-vazio">
          {podeCriarCliente
            ? "Nenhum cliente cadastrado. Comece por “+ Novo cliente” — o fluxo leva à criação da pasta."
            : "Nenhum cliente cadastrado."}
        </div>
      ) : (
        <div className="flex flex-col gap-2 overflow-x-auto pb-1">
          <div className="grid min-w-[820px] gap-4 px-[18px] pb-0.5 [grid-template-columns:minmax(200px,1.5fr)_minmax(150px,1fr)_minmax(180px,1fr)_80px_120px]">
            <span className="rotulo">Cliente</span>
            <span className="rotulo">CPF / CNPJ</span>
            <span className="rotulo">Contato</span>
            <span className="rotulo">Pastas</span>
            <span className="rotulo text-center">Ação</span>
          </div>

          {clientes.map((c) => (
            <div
              key={c.id}
              className="card grid min-w-[820px] items-center gap-4 px-[18px] py-3 [grid-template-columns:minmax(200px,1.5fr)_minmax(150px,1fr)_minmax(180px,1fr)_80px_120px]"
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <Link
                  href={`/clientes/${c.id}`}
                  className="truncate text-sm font-semibold text-texto hover:text-teal hover:no-underline"
                >
                  {c.nome}
                </Link>
                <span className="text-xs text-texto-secundario">
                  {c.tipo_pessoa === "fisica" ? "Pessoa física" : "Pessoa jurídica"}
                </span>
              </div>
              <span className="text-[13.5px] tabular-nums">
                {formatarCpfCnpj(c.cpf_cnpj)}
              </span>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[13px]">{c.telefone ?? "—"}</span>
                <span className="truncate text-xs text-texto-secundario">
                  {c.email ?? ""}
                </span>
              </div>
              <span className="text-[13.5px]">
                {c.qtd_pastas} pasta{c.qtd_pastas === 1 ? "" : "s"}
              </span>
              <div className="flex items-center justify-center gap-3">
                <Link
                  href={`/clientes/${c.id}`}
                  className="text-xs font-medium text-teal hover:underline"
                >
                  {podeEditarCliente ? "editar" : "abrir"}
                </Link>
                {podeCriarPasta && (
                  <Link
                    href={`/pastas/nova?cliente=${c.id}`}
                    className="botao-secundario"
                  >
                    + Pasta
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
