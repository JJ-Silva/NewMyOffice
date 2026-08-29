import { redirect } from "next/navigation";
import { exigirSessao } from "@/lib/supabase/sessao";
import { podeFazer } from "@/lib/domain/autorizacao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { listarTribunais } from "@/lib/db/tribunais";
import { listarFeriados } from "@/lib/db/feriados";
import { listarPeriodosNaoUteis } from "@/lib/db/periodos-nao-uteis";
import {
  adicionarTribunal,
  removerTribunal,
  adicionarFeriado,
  removerFeriado,
  adicionarPeriodoNaoUtil,
  removerPeriodoNaoUtil,
} from "./acoes";

// 'AAAA-MM-DD' → "25/12/2026 · sexta-feira" (sem passar por UTC).
function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split("-").map(Number);
  const d = new Date(ano, mes - 1, dia);
  const diaSemana = d.toLocaleDateString("pt-BR", { weekday: "long" });
  return `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${ano} · ${diaSemana}`;
}

const CAMPO =
  "rounded-md border border-tint-2 bg-white px-3 py-2 text-sm text-texto";
const BOTAO =
  "rounded-md bg-acento px-3 py-2 text-sm font-medium text-white hover:opacity-90";
const BOTAO_EXCLUIR =
  "text-xs text-atrasado hover:underline";

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
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold">Configurações</h1>
      <p className="mt-1 text-sm text-texto-secundario">
        Tribunais e calendário de feriados do escritório. Só o administrador vê
        esta tela.
      </p>

      {/* ── Tribunais ──────────────────────────────────────────────── */}
      <section className="mt-8">
        <h2 className="text-base font-semibold">Tribunais</h2>

        <form action={adicionarTribunal} className="mt-3 flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs">
            Nome
            <input name="nome" required className={CAMPO} />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            Sigla
            <input name="sigla" required className={`${CAMPO} w-28`} />
          </label>
          <button type="submit" className={BOTAO}>
            Adicionar
          </button>
        </form>

        {semTribunais ? (
          <p className="mt-3 text-sm text-texto-secundario">
            Cadastre ao menos um para vincular feriados e calcular prazos.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-tint-2 rounded-md border border-tint-2 bg-superficie">
            {tribunais.map((t) => {
              const qtd = feriados.filter((f) =>
                f.tribunais.some((x) => x.id === t.id),
              ).length;
              return (
                <li
                  key={t.id}
                  className="flex items-center justify-between px-3 py-2 text-sm"
                >
                  <span>
                    <strong>{t.sigla}</strong>
                    <span className="ml-2 text-texto-secundario">{t.nome}</span>
                    <span className="ml-2 text-xs text-texto-secundario">
                      · {qtd} feriado{qtd === 1 ? "" : "s"}
                    </span>
                  </span>
                  <form action={removerTribunal}>
                    <input type="hidden" name="id" value={t.id} />
                    <button type="submit" className={BOTAO_EXCLUIR}>
                      Excluir
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ── Feriados ───────────────────────────────────────────────── */}
      <section className="mt-8">
        <h2 className="text-base font-semibold">Feriados por tribunal</h2>

        <form action={adicionarFeriado} className="mt-3 flex flex-col gap-3">
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-xs">
              Data
              <input type="date" name="data" required className={CAMPO} />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              Descrição
              <input
                name="descricao"
                required
                placeholder="Natal, Carnaval, Corpus Christi..."
                className={`${CAMPO} w-72`}
              />
            </label>
            <label className="flex items-center gap-1 pb-2 text-xs">
              <input type="checkbox" name="repete_todo_ano" />
              Repete todo ano
            </label>
          </div>

          <fieldset className="text-xs">
            <legend className="mb-1">Tribunais sem expediente nesse dia</legend>
            {semTribunais ? (
              <span className="text-texto-secundario">
                Cadastre um tribunal primeiro.
              </span>
            ) : (
              <div className="flex flex-wrap gap-3">
                {tribunais.map((t) => (
                  <label key={t.id} className="flex items-center gap-1">
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
            <button type="submit" className={BOTAO} disabled={semTribunais}>
              Adicionar feriado
            </button>
          </div>
        </form>

        {feriados.length === 0 ? (
          <p className="mt-3 text-sm text-texto-secundario">
            Sem feriados, o cálculo considera apenas sábados e domingos.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-tint-2 rounded-md border border-tint-2 bg-superficie">
            {feriados.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between px-3 py-2 text-sm"
              >
                <span>
                  <strong>{formatarData(f.data)}</strong>
                  <span className="ml-2">{f.descricao}</span>
                  <span className="ml-2 text-xs text-texto-secundario">
                    · {f.tribunais.map((t) => t.sigla).join(", ") || "nenhum tribunal"}
                    {f.repete_todo_ano ? " · todo ano" : ""}
                  </span>
                </span>
                <form action={removerFeriado}>
                  <input type="hidden" name="id" value={f.id} />
                  <button type="submit" className={BOTAO_EXCLUIR}>
                    Excluir
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Recesso / períodos não úteis ───────────────────────────── */}
      <section className="mt-8 mb-4">
        <h2 className="text-base font-semibold">Recesso e períodos sem expediente</h2>
        <p className="mt-1 text-xs text-texto-secundario">
          Intervalos inteiros — ex.: recesso forense de 20/12 a 20/01 (CPC art. 220).
        </p>

        <form
          action={adicionarPeriodoNaoUtil}
          className="mt-3 flex flex-col gap-3"
        >
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-xs">
              Início
              <input type="date" name="data_inicio" required className={CAMPO} />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              Fim
              <input type="date" name="data_fim" required className={CAMPO} />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              Descrição
              <input
                name="descricao"
                required
                placeholder="Recesso forense"
                className={`${CAMPO} w-60`}
              />
            </label>
            <label className="flex items-center gap-1 pb-2 text-xs">
              <input type="checkbox" name="repete_todo_ano" />
              Repete todo ano
            </label>
          </div>

          <fieldset className="text-xs">
            <legend className="mb-1">Tribunais sem expediente no período</legend>
            {semTribunais ? (
              <span className="text-texto-secundario">
                Cadastre um tribunal primeiro.
              </span>
            ) : (
              <div className="flex flex-wrap gap-3">
                {tribunais.map((t) => (
                  <label key={t.id} className="flex items-center gap-1">
                    <input type="checkbox" name="tribunal_ids" value={t.id} />
                    {t.sigla}
                  </label>
                ))}
              </div>
            )}
          </fieldset>

          <div>
            <button type="submit" className={BOTAO} disabled={semTribunais}>
              Adicionar período
            </button>
          </div>
        </form>

        {periodos.length === 0 ? (
          <p className="mt-3 text-sm text-texto-secundario">
            Nenhum período cadastrado.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-tint-2 rounded-md border border-tint-2 bg-superficie">
            {periodos.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between px-3 py-2 text-sm"
              >
                <span>
                  <strong>
                    {formatarData(p.data_inicio)} até {formatarData(p.data_fim)}
                  </strong>
                  <span className="ml-2">{p.descricao}</span>
                  <span className="ml-2 text-xs text-texto-secundario">
                    · {p.tribunais.map((t) => t.sigla).join(", ") || "nenhum tribunal"}
                    {p.repete_todo_ano ? " · todo ano" : ""}
                  </span>
                </span>
                <form action={removerPeriodoNaoUtil}>
                  <input type="hidden" name="id" value={p.id} />
                  <button type="submit" className={BOTAO_EXCLUIR}>
                    Excluir
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
