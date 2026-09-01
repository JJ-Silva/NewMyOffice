import Link from "next/link";
import {
  exigirSessao,
  exigirPermissao,
  sessaoPode,
} from "@/lib/supabase/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { listarPastas } from "@/lib/db/pastas";

export default async function PaginaPastas() {
  const sessao = await exigirSessao();
  exigirPermissao(sessao, "pastas.ver");
  const supabase = await criarClienteServidor();
  const pastas = await listarPastas(supabase, sessao.escritorioId);
  const podeCriarPasta = sessaoPode(sessao, "pastas.criar");
  const podeLancarAtividade = sessaoPode(sessao, "atividades.criar");

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex items-end justify-between gap-5">
        <div className="flex flex-col gap-1.5">
          <h1 className="titulo-pagina">Pastas</h1>
          <p className="subtitulo-pagina">
            {pastas.length} pasta{pastas.length === 1 ? "" : "s"}
          </p>
        </div>
        {podeCriarPasta && (
          <Link href="/pastas/nova" className="botao-primario flex-none">
            + Nova pasta
          </Link>
        )}
      </div>

      {pastas.length === 0 ? (
        <div className="painel-vazio">
          Nenhuma pasta cadastrada. Cada pasta recebe um código automático no
          formato AAAA/NNNNNN.
        </div>
      ) : (
        <div className="flex flex-col gap-2 overflow-x-auto pb-1">
          <div className="grid min-w-[900px] gap-4 px-[18px] pb-0.5 [grid-template-columns:minmax(220px,1.6fr)_minmax(150px,1fr)_100px_120px_120px]">
            <span className="rotulo">Pasta / cliente</span>
            <span className="rotulo">Área</span>
            <span className="rotulo">Processos</span>
            <span className="rotulo">Prazos abertos</span>
            <span className="rotulo text-center">Ação</span>
          </div>

          {pastas.map((p) => {
            const clientes =
              p.clientes.map((c) => c.nome).join(", ") || "sem cliente";
            return (
              <div
                key={p.id}
                className="card grid min-w-[900px] items-center gap-4 px-[18px] py-3 [grid-template-columns:minmax(220px,1.6fr)_minmax(150px,1fr)_100px_120px_120px]"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <Link
                    href={`/pastas/${p.id}`}
                    className="truncate text-sm font-semibold text-texto hover:text-teal hover:no-underline"
                  >
                    {p.nome ?? p.codigo}
                  </Link>
                  <span className="truncate text-xs text-texto-secundario">
                    {p.nome ? `${p.codigo} · ` : ""}
                    {clientes}
                  </span>
                </div>
                <span className="text-[13px]">{p.area_nome ?? "—"}</span>
                <span className="text-[13.5px]">
                  {p.qtd_processos > 0
                    ? `${p.qtd_processos} processo${p.qtd_processos === 1 ? "" : "s"}`
                    : "—"}
                </span>
                <span
                  className="text-[13.5px] font-semibold"
                  style={{
                    color:
                      p.qtd_prazos_abertos > 0
                        ? "var(--teal)"
                        : "var(--texto-secundario)",
                  }}
                >
                  {p.qtd_prazos_abertos > 0
                    ? `${p.qtd_prazos_abertos} prazo${p.qtd_prazos_abertos === 1 ? "" : "s"}`
                    : "nenhum"}
                </span>
                <div className="flex justify-center">
                  {podeLancarAtividade && (
                    <Link
                      href={`/atividades/nova?pasta=${p.id}`}
                      className="botao-secundario"
                    >
                      + Prazo
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
