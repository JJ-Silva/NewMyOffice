import { redirect } from "next/navigation";
import { exigirSessao } from "@/lib/supabase/sessao";
import { podeFazer } from "@/lib/domain/autorizacao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { listarTribunais } from "@/lib/db/tribunais";
import { listarFeriados } from "@/lib/db/feriados";
import { listarPeriodosNaoUteis } from "@/lib/db/periodos-nao-uteis";
import { formatarDataBR, nomeDoDiaDaSemana } from "@/lib/domain/datas";
import {
  adicionarTribunal,
  removerTribunal,
  adicionarFeriado,
  removerFeriado,
  adicionarPeriodoNaoUtil,
  removerPeriodoNaoUtil,
} from "./acoes";

// 'AAAA-MM-DD' → "25/12/2026 · sexta-feira"
function formatarData(iso: string): string {
  return `${formatarDataBR(iso)} · ${nomeDoDiaDaSemana(iso)}`;
}

export default async function PaginaConfiguracoes() {
  const sessao = await exigirSessao();
  if (!podeFazer(sessao.membro, "acessar_configuracoes")) {
    redirect("/agenda");
  }

  const supabase = await criarClienteServidor();
  const [tribunais, feriados, periodos] = await Promise.all([
    listarTribunais(supabase, sessao.escritorioId),
    listarFeriados(supabase, sessao.escritorioId),
    listarPeriodosNaoUteis(supabase, sessao.escritorioId),
  ]);

  const semTribunais = tribunais.length === 0;

  return (
    <div className="flex max-w-[1180px] flex-col gap-[18px]">
      <div className="flex flex-col gap-1.5">
        <h1 className="titulo-pagina">Configurações</h1>
        <p className="subtitulo-pagina">
          Tribunais e calendário de feriados do escritório. Só o administrador
          vê esta tela.
        </p>
      </div>

      <div className="grid items-start gap-5 [grid-template-columns:repeat(auto-fit,minmax(340px,1fr))]">
        {/* ── Tribunais ──────────────────────────────────────────── */}
        <section className="card flex flex-col gap-4 p-[22px]">
          <div className="flex flex-col gap-0.5">
            <h2 className="titulo-secao">Tribunais</h2>
            <span className="text-[12.5px] text-texto-secundario">
              {tribunais.length} cadastrado{tribunais.length === 1 ? "" : "s"}
            </span>
          </div>

          <form
            action={adicionarTribunal}
            className="grid items-end gap-2.5 [grid-template-columns:1fr_110px_96px]"
          >
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="rotulo">Nome</span>
              <input
                name="nome"
                required
                placeholder="Tribunal de Justiça de São Paulo"
                className="campo"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="rotulo">Sigla</span>
              <input name="sigla" required placeholder="TJSP" className="campo" />
            </label>
            <button type="submit" className="botao-primario h-[38px] px-0">
              Adicionar
            </button>
          </form>

          {semTribunais ? (
            <p className="painel-vazio">
              Nenhum tribunal cadastrado. Cadastre ao menos um para vincular
              feriados e calcular prazos.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {tribunais.map((t) => {
                const qtd = feriados.filter((f) =>
                  f.tribunais.some((x) => x.id === t.id),
                ).length;
                return (
                  <div key={t.id} className="linha-lista">
                    <span className="etiqueta-sigla">{t.sigla}</span>
                    <div className="flex min-w-0 flex-1 flex-col gap-px">
                      <span className="truncate text-[13.5px]">{t.nome}</span>
                      <span className="text-xs text-texto-secundario">
                        {qtd} feriado{qtd === 1 ? "" : "s"}
                      </span>
                    </div>
                    <form action={removerTribunal}>
                      <input type="hidden" name="id" value={t.id} />
                      <button type="submit" className="botao-perigo">
                        Excluir
                      </button>
                    </form>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Feriados ───────────────────────────────────────────── */}
        <section className="card flex flex-col gap-4 p-[22px]">
          <div className="flex flex-col gap-0.5">
            <h2 className="titulo-secao">Feriados por tribunal</h2>
            <span className="text-[12.5px] text-texto-secundario">
              {feriados.length} cadastrado{feriados.length === 1 ? "" : "s"}
            </span>
          </div>

          <form action={adicionarFeriado} className="flex flex-col gap-2.5">
            <div className="grid items-end gap-2.5 [grid-template-columns:150px_1fr_96px]">
              <label className="flex flex-col gap-1.5">
                <span className="rotulo">Data</span>
                <input type="date" name="data" required className="campo" />
              </label>
              <label className="flex min-w-0 flex-col gap-1.5">
                <span className="rotulo">Descrição</span>
                <input
                  name="descricao"
                  required
                  placeholder="Natal, Carnaval, Corpus Christi…"
                  className="campo"
                />
              </label>
              <button
                type="submit"
                className="botao-primario h-[38px] px-0"
                disabled={semTribunais}
              >
                Adicionar
              </button>
            </div>

            <label className="flex items-center gap-2 text-xs text-texto-secundario">
              <input type="checkbox" name="repete_todo_ano" />
              Repete todo ano (só mês/dia importam)
            </label>

            <fieldset className="flex flex-col gap-1.5">
              <legend className="rotulo">
                Tribunais sem expediente nesse dia
              </legend>
              {semTribunais ? (
                <span className="text-xs text-texto-secundario">
                  Cadastre um tribunal primeiro.
                </span>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {tribunais.map((t) => (
                    <label
                      key={t.id}
                      className="flex items-center gap-1.5 text-[13px]"
                    >
                      <input
                        type="checkbox"
                        name="tribunal_ids"
                        value={t.id}
                      />
                      {t.sigla}
                    </label>
                  ))}
                </div>
              )}
            </fieldset>
          </form>

          {feriados.length === 0 ? (
            <p className="painel-vazio">
              Nenhum feriado cadastrado. Sem feriados, o cálculo considera
              apenas sábados e domingos.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {feriados.map((f) => (
                <div key={f.id} className="linha-lista">
                  <div className="flex min-w-0 flex-1 flex-col gap-px">
                    <span className="text-[13.5px]">
                      {formatarData(f.data)}
                    </span>
                    <span className="text-xs text-texto-secundario">
                      {f.descricao} ·{" "}
                      {f.tribunais.map((t) => t.sigla).join(", ") ||
                        "nenhum tribunal"}
                      {f.repete_todo_ano ? " · todo ano" : ""}
                    </span>
                  </div>
                  <form action={removerFeriado}>
                    <input type="hidden" name="id" value={f.id} />
                    <button type="submit" className="botao-perigo">
                      Excluir
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Recesso / períodos não úteis ───────────────────────── */}
        <section className="card flex flex-col gap-4 p-[22px]">
          <div className="flex flex-col gap-0.5">
            <h2 className="titulo-secao">Recesso e períodos sem expediente</h2>
            <span className="text-[12.5px] text-texto-secundario">
              Intervalos inteiros — ex.: recesso forense 20/12 a 20/01 (CPC art.
              220).
            </span>
          </div>

          <form
            action={adicionarPeriodoNaoUtil}
            className="flex flex-col gap-2.5"
          >
            <div className="grid items-end gap-2.5 [grid-template-columns:1fr_1fr]">
              <label className="flex flex-col gap-1.5">
                <span className="rotulo">Início</span>
                <input
                  type="date"
                  name="data_inicio"
                  required
                  className="campo"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="rotulo">Fim</span>
                <input
                  type="date"
                  name="data_fim"
                  required
                  className="campo"
                />
              </label>
            </div>
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="rotulo">Descrição</span>
              <input
                name="descricao"
                required
                placeholder="Recesso forense"
                className="campo"
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-texto-secundario">
              <input type="checkbox" name="repete_todo_ano" />
              Repete todo ano
            </label>

            <fieldset className="flex flex-col gap-1.5">
              <legend className="rotulo">
                Tribunais sem expediente no período
              </legend>
              {semTribunais ? (
                <span className="text-xs text-texto-secundario">
                  Cadastre um tribunal primeiro.
                </span>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {tribunais.map((t) => (
                    <label
                      key={t.id}
                      className="flex items-center gap-1.5 text-[13px]"
                    >
                      <input
                        type="checkbox"
                        name="tribunal_ids"
                        value={t.id}
                      />
                      {t.sigla}
                    </label>
                  ))}
                </div>
              )}
            </fieldset>

            <div>
              <button
                type="submit"
                className="botao-primario h-[38px]"
                disabled={semTribunais}
              >
                Adicionar período
              </button>
            </div>
          </form>

          {periodos.length === 0 ? (
            <p className="painel-vazio">Nenhum período cadastrado.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {periodos.map((p) => (
                <div key={p.id} className="linha-lista">
                  <div className="flex min-w-0 flex-1 flex-col gap-px">
                    <span className="text-[13.5px]">
                      {formatarData(p.data_inicio)} — {formatarData(p.data_fim)}
                    </span>
                    <span className="text-xs text-texto-secundario">
                      {p.descricao} ·{" "}
                      {p.tribunais.map((t) => t.sigla).join(", ") ||
                        "nenhum tribunal"}
                      {p.repete_todo_ano ? " · todo ano" : ""}
                    </span>
                  </div>
                  <form action={removerPeriodoNaoUtil}>
                    <input type="hidden" name="id" value={p.id} />
                    <button type="submit" className="botao-perigo">
                      Excluir
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
