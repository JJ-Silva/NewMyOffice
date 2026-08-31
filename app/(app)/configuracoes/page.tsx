import { redirect } from "next/navigation";
import { exigirSessao } from "@/lib/supabase/sessao";
import { podeFazer } from "@/lib/domain/autorizacao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { CamposTipoAtividade } from "@/components/CamposTipoAtividade";
import { listarTribunais } from "@/lib/db/tribunais";
import { listarFeriados } from "@/lib/db/feriados";
import { listarPeriodosNaoUteis } from "@/lib/db/periodos-nao-uteis";
import { listarOabs } from "@/lib/db/oab";
import {
  listarTiposParaGestao,
  type TipoAtividadeGestao,
} from "@/lib/db/tipos-atividade";
import { formatarDataBR, nomeDoDiaDaSemana } from "@/lib/domain/datas";
import {
  adicionarTribunal,
  removerTribunal,
  adicionarFeriado,
  removerFeriado,
  adicionarPeriodoNaoUtil,
  removerPeriodoNaoUtil,
  adicionarOabAction,
  removerOabAction,
  adicionarTipoAtividadeAction,
  editarTipoAtividadeAction,
  removerTipoAtividadeAction,
} from "./acoes";

const APLICA_A_LABEL = {
  prazo: "Prazos",
  compromisso: "Compromissos",
  monitoramento: "Monitoramentos",
} as const;

function resumoTipo(t: TipoAtividadeGestao): string {
  if (t.aplica_a !== "prazo") return "";
  return [
    t.dias_padrao != null ? `${t.dias_padrao} dias` : "dias informados no prazo",
    t.natureza,
    t.categoria,
    t.exige_peca ? "exige peça" : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

// 'AAAA-MM-DD' → "25/12/2026 · sexta-feira"
function formatarData(iso: string): string {
  return `${formatarDataBR(iso)} · ${nomeDoDiaDaSemana(iso)}`;
}

// Cada bloco de Configurações é um card recolhível, um embaixo do outro.
function SecaoRecolhivel({
  titulo,
  resumo,
  aberta = false,
  children,
}: {
  titulo: string;
  resumo: string;
  aberta?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details className="card group" open={aberta}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 [&::-webkit-details-marker]:hidden">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="titulo-secao">{titulo}</h2>
          <span className="text-[12.5px] text-texto-secundario">{resumo}</span>
        </div>
        <span className="flex-none text-texto-secundario transition-transform group-open:rotate-90">
          ▶
        </span>
      </summary>
      <div className="flex flex-col gap-4 border-t border-tint-2 p-5">
        {children}
      </div>
    </details>
  );
}

export default async function PaginaConfiguracoes({
  searchParams,
}: PageProps<"/configuracoes">) {
  const sessao = await exigirSessao();
  if (!podeFazer(sessao.membro, "acessar_configuracoes")) {
    redirect("/agenda");
  }

  const params = await searchParams;
  const erro = typeof params.erro === "string" ? params.erro : null;

  const supabase = await criarClienteServidor();
  const [tribunais, feriados, periodos, oabs, tiposAtividade] =
    await Promise.all([
      listarTribunais(supabase, sessao.escritorioId),
      listarFeriados(supabase, sessao.escritorioId),
      listarPeriodosNaoUteis(supabase, sessao.escritorioId),
      listarOabs(supabase, sessao.escritorioId),
      listarTiposParaGestao(supabase, sessao.escritorioId),
    ]);
  const tiposPorAplicaA = (["prazo", "compromisso", "monitoramento"] as const).map(
    (a) => ({ aplicaA: a, itens: tiposAtividade.filter((t) => t.aplica_a === a) }),
  );

  const semTribunais = tribunais.length === 0;
  const plural = (n: number, s: string) => `${n} ${s}${n === 1 ? "" : "s"}`;

  return (
    <div className="flex max-w-[820px] flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <h1 className="titulo-pagina">Configurações</h1>
        <p className="subtitulo-pagina">
          Tribunais, calendário e OABs do escritório. Só o administrador vê esta
          tela.
        </p>
      </div>

      {erro && (
        <p className="rounded-lg border border-atrasado bg-[var(--atrasado-fundo)] px-3 py-2 text-sm text-atrasado">
          {erro}
        </p>
      )}

      {/* ── Tribunais ──────────────────────────────────────────── */}
      <SecaoRecolhivel
        titulo="Tribunais"
        resumo={plural(tribunais.length, "cadastrado")}
        aberta={semTribunais}
      >
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
          <BotaoEnviar className="botao-primario h-[38px] px-0">
            Adicionar
          </BotaoEnviar>
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
                      {plural(qtd, "feriado")}
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
      </SecaoRecolhivel>

      {/* ── Feriados ───────────────────────────────────────────── */}
      <SecaoRecolhivel
        titulo="Feriados por tribunal"
        resumo={plural(feriados.length, "cadastrado")}
      >
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
            <BotaoEnviar
              className="botao-primario h-[38px] px-0"
              disabled={semTribunais}
            >
              Adicionar
            </BotaoEnviar>
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
                    <input type="checkbox" name="tribunal_ids" value={t.id} />
                    {t.sigla}
                  </label>
                ))}
              </div>
            )}
          </fieldset>
        </form>

        {feriados.length === 0 ? (
          <p className="painel-vazio">
            Nenhum feriado cadastrado. Sem feriados, o cálculo considera apenas
            sábados e domingos.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {feriados.map((f) => (
              <div key={f.id} className="linha-lista">
                <div className="flex min-w-0 flex-1 flex-col gap-px">
                  <span className="text-[13.5px]">{formatarData(f.data)}</span>
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
      </SecaoRecolhivel>

      {/* ── Recesso / períodos não úteis ───────────────────────── */}
      <SecaoRecolhivel
        titulo="Recesso e períodos sem expediente"
        resumo={
          periodos.length === 0
            ? "Intervalos inteiros — ex.: recesso forense (CPC art. 220)"
            : plural(periodos.length, "cadastrado")
        }
      >
        <form action={adicionarPeriodoNaoUtil} className="flex flex-col gap-2.5">
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
              <input type="date" name="data_fim" required className="campo" />
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
                    <input type="checkbox" name="tribunal_ids" value={t.id} />
                    {t.sigla}
                  </label>
                ))}
              </div>
            )}
          </fieldset>

          <div>
            <BotaoEnviar
              className="botao-primario h-[38px]"
              disabled={semTribunais}
            >
              Adicionar período
            </BotaoEnviar>
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
      </SecaoRecolhivel>

      {/* ── OABs monitoradas (DJEN) ────────────────────────────── */}
      <SecaoRecolhivel
        titulo="OABs monitoradas (DJEN)"
        resumo={
          oabs.length === 0
            ? "Para buscar publicações no Diário de Justiça Nacional"
            : plural(oabs.length, "OAB")
        }
      >
        <form
          action={adicionarOabAction}
          className="grid items-end gap-2.5 [grid-template-columns:1fr_110px_70px_96px]"
        >
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="rotulo">Advogado (opcional)</span>
            <input
              name="nome_advogado"
              placeholder="José Jefferson da Silva"
              className="campo"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="rotulo">Nº OAB</span>
            <input
              name="numero"
              required
              inputMode="numeric"
              placeholder="515392"
              className="campo"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="rotulo">UF</span>
            <input
              name="uf"
              required
              maxLength={2}
              placeholder="SP"
              className="campo uppercase"
            />
          </label>
          <BotaoEnviar className="botao-primario h-[38px] px-0">
            Adicionar
          </BotaoEnviar>
        </form>

        {oabs.length === 0 ? (
          <p className="painel-vazio">
            Nenhuma OAB cadastrada. Adicione ao menos uma para buscar publicações
            no DJEN.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {oabs.map((o) => (
              <div key={o.id} className="linha-lista">
                <span className="etiqueta-sigla">
                  {o.numero}/{o.uf}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-px">
                  <span className="truncate text-[13.5px]">
                    {o.nomeAdvogado ?? "—"}
                  </span>
                  <span className="text-xs text-texto-secundario">
                    {o.ativo ? "ativa" : "inativa"}
                  </span>
                </div>
                <form action={removerOabAction}>
                  <input type="hidden" name="id" value={o.id} />
                  <button type="submit" className="botao-perigo">
                    Excluir
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </SecaoRecolhivel>

      {/* ── Tipos de atividade (catálogo) ──────────────────────── */}
      <SecaoRecolhivel
        titulo="Tipos de atividade"
        resumo={plural(tiposAtividade.length, "tipo")}
      >
        <details className="rounded-lg border border-tint-2 p-3.5">
          <summary className="cursor-pointer text-sm font-semibold">
            + Novo tipo
          </summary>
          <form
            action={adicionarTipoAtividadeAction}
            className="mt-3 flex flex-col gap-3"
          >
            <CamposTipoAtividade idDatalist="cat-novo-tipo" />
            <BotaoEnviar className="botao-primario h-[38px] self-start">
              Adicionar tipo
            </BotaoEnviar>
          </form>
        </details>

        {tiposPorAplicaA.map(({ aplicaA, itens }) => (
          <div key={aplicaA} className="flex flex-col gap-2">
            <span className="rotulo">
              {APLICA_A_LABEL[aplicaA]} ({itens.length})
            </span>
            {itens.length === 0 ? (
              <span className="text-xs text-texto-secundario">Nenhum.</span>
            ) : (
              itens.map((t) => (
                <details
                  key={t.id}
                  className="rounded-lg border border-tint-2"
                >
                  <summary className="flex cursor-pointer items-center gap-2 p-2.5">
                    <div className="flex min-w-0 flex-1 flex-col gap-px">
                      <span className="truncate text-[13.5px]">{t.nome}</span>
                      {resumoTipo(t) && (
                        <span className="truncate text-xs text-texto-secundario">
                          {resumoTipo(t)}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-teal">editar</span>
                  </summary>
                  <div className="flex flex-col gap-3 border-t border-tint-2 p-3">
                    <form
                      action={editarTipoAtividadeAction}
                      className="flex flex-col gap-3"
                    >
                      <input type="hidden" name="id" value={t.id} />
                      <CamposTipoAtividade
                        idDatalist={`cat-${t.id}`}
                        nome={t.nome}
                        aplicaA={t.aplica_a}
                        diasPadrao={t.dias_padrao}
                        natureza={t.natureza}
                        exigePeca={t.exige_peca}
                        categoria={t.categoria}
                      />
                      <div className="flex items-center gap-3">
                        <BotaoEnviar className="botao-primario h-[36px]">
                          Salvar
                        </BotaoEnviar>
                      </div>
                    </form>
                    <form action={removerTipoAtividadeAction}>
                      <input type="hidden" name="id" value={t.id} />
                      <button type="submit" className="botao-perigo">
                        Excluir tipo
                      </button>
                    </form>
                  </div>
                </details>
              ))
            )}
          </div>
        ))}
      </SecaoRecolhivel>
    </div>
  );
}
