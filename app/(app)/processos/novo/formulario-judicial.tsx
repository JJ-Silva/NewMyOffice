import Link from "next/link";
import type { Route } from "next";
import { analisarCnj } from "@/lib/domain/cnj";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import type { PastaResumo } from "@/lib/db/pastas";
import type { Tribunal } from "@/lib/db/tribunais";
import { salvarProcessoJudicial } from "./acoes";

const POLOS = [
  { valor: "autor", label: "Autor / requerente" },
  { valor: "reu", label: "Réu / requerido" },
  { valor: "terceiro", label: "Terceiro interessado" },
];

export function FormularioJudicial({
  pastas,
  tribunais,
  valores,
  erro,
  retorno,
  hrefCriarPasta,
}: {
  pastas: PastaResumo[];
  tribunais: Tribunal[];
  valores: Record<string, string>;
  erro: string | null;
  retorno: string | null;
  hrefCriarPasta: string;
}) {
  const cnjInformado = valores.cnj ?? "";
  const analise = cnjInformado ? analisarCnj(cnjInformado) : null;

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
          <span className="rotulo">Número do processo (CNJ)</span>
          <input
            name="cnj"
            required
            defaultValue={cnjInformado}
            placeholder="0000000-00.0000.0.00.0000"
            className="campo tabular-nums"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="rotulo">Tribunal (catálogo de Configurações)</span>
          <select
            name="tribunal"
            defaultValue={valores.tribunal ?? ""}
            className="campo"
          >
            <option value="">— não vincular —</option>
            {tribunais.map((t) => (
              <option key={t.id} value={t.id}>
                {t.sigla} — {t.nome}
              </option>
            ))}
          </select>
        </label>

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

        <div className="flex gap-3 pt-1">
          <button type="submit" className="botao-primario">
            Conferir número
          </button>
          <Link
            href={(retorno ?? "/processos") as Route}
            className="flex h-10 items-center rounded-lg border border-tint-3 bg-white px-4 text-sm font-medium"
          >
            Cancelar
          </Link>
        </div>
      </form>

      {/* Reconhecimento do CNJ + salvar */}
      <div className="card flex flex-col gap-4 p-6">
        <h2 className="titulo-secao">Número CNJ</h2>

        {!analise ? (
          <p className="text-sm text-texto-secundario">
            Digite o número e clique em “Conferir número”. O sistema valida o
            dígito verificador (Resolução CNJ 65/2008) e reconhece a justiça e o
            tribunal.
          </p>
        ) : !analise.ok ? (
          <p className="rounded-lg border border-atrasado bg-[var(--atrasado-fundo)] px-3 py-2 text-sm text-atrasado">
            {analise.erro}
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-1 rounded-lg border border-tint-2 bg-fundo p-3.5">
              <span className="text-lg font-semibold tabular-nums">
                {analise.cnj.formatado}
              </span>
              <span className="text-[13px]">
                {analise.cnj.descricaoSegmento} · tribunal{" "}
                {String(analise.cnj.partes.tribunal).padStart(2, "0")} · ano{" "}
                {analise.cnj.partes.ano}
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
