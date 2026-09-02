import Link from "next/link";
import type { Route } from "next";
import { analisarCnj } from "@/lib/domain/cnj";
import {
  identificarTribunal,
  TRIBUNAIS_CONHECIDOS,
} from "@/lib/domain/tribunais-cnj";
import type { CamposSugeridosDatajud } from "@/lib/domain/processo-datajud";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import type { PastaResumo } from "@/lib/db/pastas";
import { salvarProcessoJudicial } from "./acoes";

const POLOS = [
  { valor: "autor", label: "Autor / requerente" },
  { valor: "reu", label: "Réu / requerido" },
  { valor: "terceiro", label: "Terceiro interessado" },
];

export function FormularioJudicial({
  pastas,
  valores,
  erro,
  retorno,
  hrefCriarPasta,
  datajud,
  datajudErro,
}: {
  pastas: PastaResumo[];
  valores: Record<string, string>;
  erro: string | null;
  retorno: string | null;
  hrefCriarPasta: string;
  datajud: CamposSugeridosDatajud | null;
  datajudErro: string | null;
}) {
  const numeroInformado = valores.numero ?? "";
  const analise = numeroInformado ? analisarCnj(numeroInformado) : null;
  const ehCnj = analise?.ok ?? false;
  const tribunal =
    analise?.ok ? identificarTribunal(analise.cnj.partes) : null;

  return (
    <div className="grid items-start gap-5 [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))] max-w-[1000px]">
      {/* Formulário (GET → recarrega com o reconhecimento do número) */}
      <form
        method="get"
        action="/processos/novo"
        className="card flex flex-col gap-4 p-6"
      >
        <input type="hidden" name="tipo" value="judicial" />
        {valores.publicacao && (
          <input type="hidden" name="publicacao" value={valores.publicacao} />
        )}
        {retorno && <input type="hidden" name="retorno" value={retorno} />}
        <h2 className="titulo-secao">Processo judicial</h2>

        {erro && (
          <p className="rounded-lg border border-atrasado bg-[var(--atrasado-fundo)] px-3 py-2 text-sm text-atrasado">
            {erro}
          </p>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="flex items-center justify-between">
            <span className="rotulo">Pasta vinculada</span>
            <Link
              href={hrefCriarPasta as Route}
              className="text-xs font-medium text-teal hover:underline"
            >
              + criar pasta
            </Link>
          </span>
          <select
            name="pasta"
            required
            defaultValue={valores.pasta ?? ""}
            className="campo"
          >
            <option value="" disabled>
              Selecione a pasta…
            </option>
            {pastas.map((p) => (
              <option key={p.id} value={p.id}>
                {(p.nome ?? p.codigo) +
                  (p.clientes[0] ? ` · ${p.clientes[0].nome}` : "")}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="rotulo">Número do processo</span>
          <input
            name="numero"
            required
            defaultValue={numeroInformado}
            placeholder="CNJ, REsp, RE, AREsp, número antigo…"
            className="campo tabular-nums"
          />
          <span className="text-xs text-texto-secundario">
            Se for um CNJ, o tribunal é identificado pelo número. Senão, escolha
            o tribunal abaixo.
          </span>
        </label>

        {numeroInformado && !ehCnj && (
          <label className="flex flex-col gap-1.5">
            <span className="rotulo">Tribunal</span>
            <select
              name="tribunal_codigo"
              defaultValue={valores.tribunal_codigo ?? ""}
              className="campo"
            >
              <option value="" disabled>
                Selecione o tribunal…
              </option>
              {TRIBUNAIS_CONHECIDOS.map((t) => (
                <option key={t.codigo} value={t.codigo}>
                  {t.sigla} — {t.nome}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="grid gap-4 [grid-template-columns:1fr_1fr]">
          <label className="flex flex-col gap-1.5">
            <span className="rotulo">Vara</span>
            <input name="vara" defaultValue={valores.vara ?? ""} className="campo" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="rotulo">Comarca</span>
            <input
              name="comarca"
              defaultValue={valores.comarca ?? ""}
              className="campo"
            />
          </label>
        </div>

        <div className="grid gap-4 [grid-template-columns:1fr_1fr]">
          <label className="flex flex-col gap-1.5">
            <span className="rotulo">Instância</span>
            <input
              name="instancia"
              defaultValue={valores.instancia ?? ""}
              placeholder="1º grau, 2º grau…"
              className="campo"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="rotulo">Classe / tipo de ação</span>
            <input
              name="tipo_acao"
              defaultValue={valores.tipo_acao ?? ""}
              className="campo"
            />
          </label>
        </div>

        <div className="grid gap-4 [grid-template-columns:1fr_1fr]">
          <label className="flex flex-col gap-1.5">
            <span className="rotulo">Fase atual</span>
            <input name="fase" defaultValue={valores.fase ?? ""} className="campo" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="rotulo">Nosso polo</span>
            <select
              name="polo"
              defaultValue={valores.polo ?? ""}
              className="campo"
            >
              <option value="">—</option>
              {POLOS.map((p) => (
                <option key={p.valor} value={p.valor}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 [grid-template-columns:1fr_1fr]">
          <label className="flex flex-col gap-1.5">
            <span className="rotulo">Valor da causa (R$)</span>
            <input
              type="number"
              step="0.01"
              min="0"
              name="valor_causa"
              defaultValue={valores.valor_causa ?? ""}
              className="campo"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="rotulo">Data de distribuição</span>
            <input
              type="date"
              name="data_distribuicao"
              defaultValue={valores.data_distribuicao ?? ""}
              className="campo"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-3 pt-1">
          <button type="submit" className="botao-primario">
            Conferir número
          </button>
          {ehCnj && (
            <button
              type="submit"
              name="buscar_datajud"
              value="1"
              className="botao-secundario h-10"
            >
              Buscar dados no DataJud
            </button>
          )}
          <Link
            href={(retorno ?? "/processos") as Route}
            className="flex h-10 items-center rounded-lg border border-tint-3 bg-white px-4 text-sm font-medium"
          >
            Cancelar
          </Link>
        </div>
      </form>

      {/* Reconhecimento do número + salvar */}
      <div className="card flex flex-col gap-4 p-6">
        <h2 className="titulo-secao">Número</h2>

        {!numeroInformado ? (
          <p className="text-sm text-texto-secundario">
            Digite o número e clique em “Conferir número”. Se for um CNJ, o
            sistema valida o dígito verificador (Resolução CNJ 65/2008) e
            identifica o tribunal.
          </p>
        ) : ehCnj && analise?.ok ? (
          <>
            <div className="flex flex-col gap-1 rounded-lg border border-tint-2 bg-fundo p-3.5">
              <span className="text-lg font-semibold tabular-nums">
                {analise.cnj.formatado}
              </span>
              <span className="text-[13px]">
                {tribunal ? (
                  <>
                    <strong>{tribunal.sigla}</strong> — {tribunal.nome}
                  </>
                ) : (
                  <>
                    {analise.cnj.descricaoSegmento} · tribunal{" "}
                    {String(analise.cnj.partes.tribunal).padStart(2, "0")}
                  </>
                )}{" "}
                · ano {analise.cnj.partes.ano}
              </span>
            </div>

            {analise.cnj.digitoConfere ? (
              <p className="rounded-lg border border-cumprido bg-[#F0FDF4] px-3.5 py-2.5 text-[13px] text-[#166534]">
                ✓ Dígito verificador confere.
              </p>
            ) : (
              <p className="rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-3.5 py-2.5 text-[13px] text-[#92400E]">
                ⚠ O dígito verificador <strong>não confere</strong> — confira se
                digitou certo. Você ainda pode salvar assim; fica marcado no
                processo.
              </p>
            )}

            {datajudErro && (
              <p className="rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-3.5 py-2.5 text-[13px] text-[#92400E]">
                {datajudErro}
              </p>
            )}
            {datajud && (
              <div className="flex flex-col gap-1 rounded-lg border border-cumprido bg-[#F0FDF4] p-3.5 text-[13px] text-[#166534]">
                <span className="font-semibold">✓ Encontrado no DataJud</span>
                {datajud.tipoAcao && <span>Classe: {datajud.tipoAcao}</span>}
                {datajud.vara && <span>Órgão: {datajud.vara}</span>}
                {datajud.comarca && <span>Comarca: {datajud.comarca}</span>}
                {datajud.instancia && <span>Instância: {datajud.instancia}</span>}
                {datajud.dataDistribuicao && (
                  <span>Distribuição: {datajud.dataDistribuicao}</span>
                )}
                <span className="text-[12px] opacity-80">
                  Os campos vazios do formulário foram preenchidos — confira e
                  ajuste antes de salvar.
                </span>
              </div>
            )}
          </>
        ) : (
          <p className="rounded-lg border border-tint-2 bg-fundo px-3.5 py-2.5 text-[13px] text-texto-secundario">
            <strong>{numeroInformado}</strong> não está no padrão CNJ (é um REsp,
            RE, número antigo…). Escolha o tribunal na lista ao lado e clique de
            novo em “Conferir número”. O DataJud só consulta por CNJ.
            {valores.tribunal_codigo && (
              <span className="mt-1 block font-medium text-[#166534]">
                ✓ Tribunal selecionado.
              </span>
            )}
          </p>
        )}

        {numeroInformado && (
          <>
            <div className="h-px bg-tint-2" />
            <form action={salvarProcessoJudicial} className="flex flex-col gap-3">
              {Object.entries(valores).map(([k, v]) => (
                <input key={k} type="hidden" name={k} value={v} />
              ))}
              <BotaoEnviar className="botao-primario h-[42px]">
                Salvar processo
              </BotaoEnviar>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
