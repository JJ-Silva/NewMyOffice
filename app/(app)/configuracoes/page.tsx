import { redirect } from "next/navigation";
import { headers } from "next/headers";
import {
  exigirSessao,
  podeAbrirConfiguracoes,
  sessaoPode,
} from "@/lib/supabase/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { CamposTipoAtividade } from "@/components/CamposTipoAtividade";
import { FormularioRotulo } from "@/components/FormularioRotulo";
import { listarTribunais } from "@/lib/db/tribunais";
import { listarFeriados } from "@/lib/db/feriados";
import { listarPeriodosNaoUteis } from "@/lib/db/periodos-nao-uteis";
import { listarOabs } from "@/lib/db/oab";
import {
  listarTiposParaGestao,
  type TipoAtividadeGestao,
} from "@/lib/db/tipos-atividade";
import { listarRotulos } from "@/lib/db/rotulos";
import { listarEquipe } from "@/lib/db/membros";
import { listarConvitesPendentes } from "@/lib/db/convites";
import { CopiarLink } from "@/components/CopiarLink";
import { TODAS_PERMISSOES, rotuloDaPermissao } from "@/lib/domain/permissoes";
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
  criarRotuloAction,
  editarRotuloAction,
  excluirRotuloAction,
  trocarRotuloMembroAction,
  alternarAtivoMembroAction,
  definirOverrideMembroAction,
  convidarMembroAction,
  cancelarConviteAction,
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
  if (!podeAbrirConfiguracoes(sessao)) {
    redirect("/agenda");
  }
  const podeCalendario = sessaoPode(sessao, "config.tribunais");
  const podeOab = sessaoPode(sessao, "oab.gerenciar");
  const podeCatalogos = sessaoPode(sessao, "config.catalogos");
  const podeRotulos = sessaoPode(sessao, "rotulos.gerenciar");
  const podeMembros = sessaoPode(sessao, "membros.gerenciar");

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

  // Rótulos e equipe — só quem administra vê. Equipe também precisa da lista
  // de rótulos para o select "trocar rótulo".
  const rotulos =
    podeRotulos || podeMembros
      ? await listarRotulos(supabase, sessao.escritorioId)
      : [];
  const equipe = podeMembros
    ? await listarEquipe(supabase, sessao.escritorioId, sessao.usuario.id)
    : [];
  const convites = podeMembros
    ? await listarConvitesPendentes(supabase, sessao.escritorioId)
    : [];

  // Origem para montar o link do convite (fallback: localhost).
  const cab = await headers();
  const host = cab.get("host") ?? "localhost:3000";
  const proto =
    cab.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const origem = `${proto}://${host}`;

  const semTribunais = tribunais.length === 0;
  const plural = (n: number, s: string) => `${n} ${s}${n === 1 ? "" : "s"}`;

  return (
    <div className="flex max-w-[820px] flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <h1 className="titulo-pagina">Configurações</h1>
        <p className="subtitulo-pagina">
          Equipe, rótulos, tribunais e catálogos do escritório. Cada seção
          aparece conforme as suas permissões.
        </p>
      </div>

      {erro && (
        <p className="rounded-lg border border-atrasado bg-[var(--atrasado-fundo)] px-3 py-2 text-sm text-atrasado">
          {erro}
        </p>
      )}

      {/* ── Rótulos e permissões ───────────────────────────────── */}
      {podeRotulos && (
        <SecaoRecolhivel
          titulo="Rótulos e permissões"
          resumo={plural(rotulos.length, "rótulo")}
        >
          <p className="text-[12.5px] text-texto-secundario">
            O rótulo é a função da pessoa no escritório. Marque o que cada
            rótulo pode fazer. Marcar qualquer ação de um grupo liga o “ver” do
            grupo junto.
          </p>

          <details className="rounded-lg border border-tint-2 p-3.5">
            <summary className="cursor-pointer text-sm font-semibold">
              + Novo rótulo
            </summary>
            <div className="mt-3">
              <FormularioRotulo
                action={criarRotuloAction}
                rotuloEnviar="Criar rótulo"
              />
            </div>
          </details>

          <div className="flex flex-col gap-2">
            {rotulos.map((r) => (
              <details
                key={r.id}
                className="rounded-lg border border-tint-2 p-3.5"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-3">
                  <span className="text-sm font-semibold">{r.nome}</span>
                  <span className="text-xs text-texto-secundario">
                    {plural(r.permissoes.length, "permissão")} ·{" "}
                    {plural(r.qtdMembros, "membro")}
                  </span>
                </summary>
                <div className="mt-3 flex flex-col gap-4">
                  <FormularioRotulo
                    action={editarRotuloAction}
                    id={r.id}
                    nome={r.nome}
                    descricao={r.descricao ?? ""}
                    permissoes={r.permissoes}
                    rotuloEnviar="Salvar rótulo"
                  />
                  <details className="text-sm">
                    <summary className="cursor-pointer text-texto-secundario">
                      Excluir este rótulo
                    </summary>
                    {r.qtdMembros > 0 ? (
                      <p className="mt-2 text-[13px] text-texto-secundario">
                        Não dá para excluir: {plural(r.qtdMembros, "membro")} com
                        este rótulo. Troque o rótulo dessas pessoas antes.
                      </p>
                    ) : (
                      <form
                        action={excluirRotuloAction}
                        className="mt-2 flex items-center gap-2"
                      >
                        <input type="hidden" name="id" value={r.id} />
                        <BotaoEnviar
                          className="botao-perigo h-[34px]"
                          rotuloOcupado="…"
                        >
                          Excluir rótulo
                        </BotaoEnviar>
                      </form>
                    )}
                  </details>
                </div>
              </details>
            ))}
          </div>
        </SecaoRecolhivel>
      )}

      {/* ── Equipe ─────────────────────────────────────────────── */}
      {podeMembros && (
        <SecaoRecolhivel
          titulo="Equipe"
          resumo={plural(equipe.length, "membro")}
        >
          <p className="text-[12.5px] text-texto-secundario">
            Cada pessoa recebe um rótulo. As exceções ajustam uma permissão só
            para aquela pessoa, sem mexer no rótulo.
          </p>

          {/* Convidar */}
          <details className="rounded-lg border border-tint-2 p-3.5">
            <summary className="cursor-pointer text-sm font-semibold">
              + Convidar pessoa
            </summary>
            <form
              action={convidarMembroAction}
              className="mt-3 flex flex-wrap items-end gap-2"
            >
              <label className="flex flex-col gap-1.5">
                <span className="rotulo">E-mail</span>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="pessoa@escritorio.adv.br"
                  className="campo w-[260px]"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="rotulo">Rótulo</span>
                <select name="rotulo_id" defaultValue="" className="campo w-[200px]">
                  <option value="">— sem rótulo —</option>
                  {rotulos.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nome}
                    </option>
                  ))}
                </select>
              </label>
              <BotaoEnviar className="botao-primario h-[38px]" rotuloOcupado="…">
                Convidar
              </BotaoEnviar>
            </form>
            <p className="mt-2 text-[12px] text-texto-secundario">
              Depois de convidar, copie o link abaixo e mande para a pessoa
              (e-mail, WhatsApp). Ela cria a conta pelo próprio link. Vale por 14
              dias.
            </p>
          </details>

          {convites.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="rotulo">Convites pendentes</span>
              {convites.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-tint-2 p-3 text-[13px]"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="font-medium">{c.email}</span>
                    <span className="text-xs text-texto-secundario">
                      {c.rotuloNome ?? "sem rótulo"}
                    </span>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <CopiarLink url={`${origem}/convite/${c.token}`} />
                    <form action={cancelarConviteAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <button
                        type="submit"
                        className="text-xs text-atrasado hover:underline"
                      >
                        cancelar
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2">
            {equipe.map((m) => (
              <div
                key={m.id}
                className="flex flex-col gap-2.5 rounded-lg border border-tint-2 p-3.5"
                style={{ opacity: m.ativo ? 1 : 0.55 }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-col">
                    <span className="text-sm font-semibold">
                      {m.usuarioNome}
                      {m.ehVoce && (
                        <span className="ml-1.5 text-xs font-normal text-texto-secundario">
                          (você)
                        </span>
                      )}
                      {m.fundador && (
                        <span className="ml-1.5 rounded bg-fundo px-1.5 py-0.5 text-[11px] font-medium text-teal">
                          sócio fundador
                        </span>
                      )}
                      {!m.ativo && (
                        <span className="ml-1.5 text-[11px] font-normal text-atrasado">
                          inativo
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-texto-secundario">
                      {m.usuarioEmail}
                    </span>
                  </div>

                  {!m.fundador && !m.ehVoce && (
                    <form action={alternarAtivoMembroAction}>
                      <input type="hidden" name="membro_id" value={m.id} />
                      <input
                        type="hidden"
                        name="ativo"
                        value={m.ativo ? "0" : "1"}
                      />
                      <BotaoEnviar
                        className="botao-secundario h-[32px]"
                        rotuloOcupado="…"
                      >
                        {m.ativo ? "Desativar" : "Reativar"}
                      </BotaoEnviar>
                    </form>
                  )}
                </div>

                <form
                  action={trocarRotuloMembroAction}
                  className="flex flex-wrap items-end gap-2"
                >
                  <input type="hidden" name="membro_id" value={m.id} />
                  <label className="flex flex-col gap-1.5">
                    <span className="rotulo">Rótulo</span>
                    <select
                      name="rotulo_id"
                      defaultValue={m.rotuloId ?? ""}
                      className="campo w-[240px]"
                    >
                      <option value="">— sem rótulo —</option>
                      {rotulos.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.nome}
                        </option>
                      ))}
                    </select>
                  </label>
                  <BotaoEnviar
                    className="botao-secundario h-[38px]"
                    rotuloOcupado="…"
                  >
                    Trocar
                  </BotaoEnviar>
                  {m.fundador && (
                    <span className="pb-2 text-[11px] text-texto-secundario">
                      O fundador enxerga tudo, tenha o rótulo que tiver.
                    </span>
                  )}
                </form>

                <details className="text-sm">
                  <summary className="cursor-pointer text-texto-secundario">
                    Exceções de permissão ({m.overrides.length})
                  </summary>
                  <div className="mt-2 flex flex-col gap-2">
                    {m.overrides.map((o) => (
                      <form
                        key={o.permissao}
                        action={definirOverrideMembroAction}
                        className="flex flex-wrap items-center gap-2 text-[13px]"
                      >
                        <input type="hidden" name="membro_id" value={m.id} />
                        <input
                          type="hidden"
                          name="permissao"
                          value={o.permissao}
                        />
                        <input type="hidden" name="valor" value="herda" />
                        <span
                          className={
                            "rounded px-1.5 py-0.5 text-[11px] font-medium " +
                            (o.concedida
                              ? "bg-[#F0FDF4] text-[#166534]"
                              : "bg-[var(--atrasado-fundo)] text-atrasado")
                          }
                        >
                          {o.concedida ? "concede" : "nega"}
                        </span>
                        <span className="flex-1">
                          {rotuloDaPermissao(o.permissao)}
                        </span>
                        <button
                          type="submit"
                          className="text-xs text-teal hover:underline"
                        >
                          voltar a herdar
                        </button>
                      </form>
                    ))}

                    <form
                      action={definirOverrideMembroAction}
                      className="mt-1 flex flex-wrap items-end gap-2"
                    >
                      <input type="hidden" name="membro_id" value={m.id} />
                      <label className="flex flex-col gap-1.5">
                        <span className="rotulo">Permissão</span>
                        <select
                          name="permissao"
                          required
                          defaultValue=""
                          className="campo w-[280px]"
                        >
                          <option value="" disabled>
                            Escolha a permissão…
                          </option>
                          {TODAS_PERMISSOES.map((p) => (
                            <option key={p} value={p}>
                              {rotuloDaPermissao(p)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1.5">
                        <span className="rotulo">Efeito</span>
                        <select
                          name="valor"
                          defaultValue="concede"
                          className="campo w-[130px]"
                        >
                          <option value="concede">Sempre pode</option>
                          <option value="nega">Nunca pode</option>
                        </select>
                      </label>
                      <BotaoEnviar
                        className="botao-secundario h-[38px]"
                        rotuloOcupado="…"
                      >
                        Adicionar exceção
                      </BotaoEnviar>
                    </form>
                  </div>
                </details>
              </div>
            ))}
          </div>
        </SecaoRecolhivel>
      )}

      {podeCalendario && (
      <>
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
      </>
      )}

      {/* ── OABs monitoradas (DJEN) ────────────────────────────── */}
      {podeOab && (
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
      )}

      {/* ── Tipos de atividade (catálogo) ──────────────────────── */}
      {podeCatalogos && (
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
      )}
    </div>
  );
}
