import Link from "next/link";
import { MemoriaCalculoPainel } from "@/components/MemoriaCalculo";
import type { PastaResumo } from "@/lib/db/pastas";
import type { TipoAtividadeCatalogo } from "@/lib/db/tipos-atividade";
import type { Tribunal } from "@/lib/db/tribunais";
import type { ProcessoResumo } from "@/lib/db/processos";
import {
  EVENTOS,
  type CamposPrazo,
  type CalculoPronto,
} from "./calculo";
import { salvarPrazo } from "./acoes";

function rotuloProcesso(p: ProcessoResumo): string {
  if (p.tipo === "geral") return "Geral da pasta (sem processo)";
  const t = p.tipo === "judicial" ? "Judicial" : "Administrativo";
  return `${p.numero ?? "sem número"} — ${t}`;
}

export function FormularioPrazo({
  campos,
  pastas,
  processos,
  tipos,
  tribunais,
  calc,
  erro,
}: {
  campos: CamposPrazo;
  pastas: PastaResumo[];
  processos: ProcessoResumo[];
  tipos: TipoAtividadeCatalogo[];
  tribunais: Tribunal[];
  calc: { ok: true; dados: CalculoPronto } | { ok: false; erro: string } | null;
  erro: string | null;
}) {
  const geralId = processos.find((p) => p.tipo === "geral")?.id ?? "";
  const nivelAtual = campos.nivel || geralId;
  const tipoSelecionado = tipos.find((t) => t.id === campos.tipoAtividadeId);
  const diasPlaceholder =
    tipoSelecionado?.dias_padrao != null
      ? `padrão do tipo: ${tipoSelecionado.dias_padrao}`
      : "informe os dias";

  return (
    <div className="grid items-start gap-5 [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))] max-w-[1180px]">
      {/* Formulário (GET → recarrega com a prévia) */}
      <form
        method="get"
        action="/atividades/nova"
        className="card flex flex-col gap-4 p-6"
      >
        <input type="hidden" name="aba" value="prazo" />
        <h2 className="titulo-secao">Dados do prazo</h2>

        {erro && (
          <p className="rounded-lg border border-atrasado bg-[var(--atrasado-fundo)] px-3 py-2 text-sm text-atrasado">
            {erro}
          </p>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="rotulo">Pasta vinculada</span>
          <select
            name="pasta"
            required
            defaultValue={campos.pastaId}
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
          <span className="rotulo">Nível da atividade</span>
          <select
            name="nivel"
            defaultValue={nivelAtual}
            className="campo"
            disabled={processos.length <= 1}
          >
            {processos.length === 0 && (
              <option value="">selecione a pasta primeiro</option>
            )}
            {processos.map((p) => (
              <option key={p.id} value={p.id}>
                {rotuloProcesso(p)}
              </option>
            ))}
          </select>
          <span className="text-xs text-texto-secundario">
            O prazo se liga a um processo específico da pasta, ou ao “geral”
            (trabalho da pasta sem número de processo).
          </span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="rotulo">Tribunal (calendário de feriados)</span>
          <select
            name="tribunal"
            defaultValue={campos.tribunalId ?? ""}
            className="campo"
          >
            <option value="">Sem tribunal (só sábados e domingos)</option>
            {tribunais.map((t) => (
              <option key={t.id} value={t.id}>
                {t.sigla} — {t.nome}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="rotulo">Tipo de prazo</span>
          <select
            name="tipo"
            required
            defaultValue={campos.tipoAtividadeId}
            className="campo"
          >
            <option value="" disabled>
              Selecione o tipo…
            </option>
            {tipos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
                {t.natureza === "interna" ? " (interna)" : ""}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-4 [grid-template-columns:1fr_1fr]">
          <label className="flex flex-col gap-1.5">
            <span className="rotulo">Dias do prazo</span>
            <input
              type="number"
              name="dias"
              min={1}
              defaultValue={campos.diasInformado ?? ""}
              placeholder={diasPlaceholder}
              className="campo"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="rotulo">Evento (termo inicial)</span>
            <select
              name="evento_tipo"
              defaultValue={campos.eventoTipo}
              className="campo"
            >
              {EVENTOS.map((e) => (
                <option key={e.valor} value={e.valor}>
                  {e.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="rotulo">Data do evento (disponibilização)</span>
          <input
            type="date"
            name="evento_data"
            required
            defaultValue={campos.eventoData}
            className="campo"
          />
        </label>

        <label className="flex items-center gap-2 rounded-lg border border-tint-2 bg-fundo px-3 py-2.5">
          <input
            type="checkbox"
            name="dobro"
            value="1"
            defaultChecked={campos.dobro}
          />
          <span className="flex flex-col">
            <span className="text-[13.5px] font-medium">Prazo em dobro</span>
            <span className="text-xs text-texto-secundario">
              Litisconsortes com procuradores distintos, Defensoria, MP
            </span>
          </span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="rotulo">Título (opcional)</span>
          <input
            name="titulo"
            defaultValue={campos.titulo}
            placeholder="Em branco = nome do tipo de prazo"
            className="campo"
          />
        </label>

        <div className="flex gap-3 pt-1">
          <button type="submit" className="botao-primario">
            Calcular prazo
          </button>
          <Link
            href="/agenda"
            className="flex h-10 items-center rounded-lg border border-tint-3 bg-white px-4 text-sm font-medium"
          >
            Cancelar
          </Link>
        </div>
      </form>

      {/* Memória de cálculo */}
      {calc && calc.ok ? (
        <MemoriaCalculoPainel
          memoria={calc.dados.resultado.memoriaCalculo}
          eventoTipo={campos.eventoTipo}
          prazoFatal={calc.dados.resultado.prazoFatalCalculado}
          prazoInterno={calc.dados.resultado.prazoInternoCalculado}
          prazoApertado={calc.dados.resultado.prazoApertado}
          aviso={calc.dados.resultado.avisoCalendarioIncompleto}
        >
          <form action={salvarPrazo} className="flex flex-col gap-3">
            <input type="hidden" name="pasta" value={campos.pastaId} />
            <input
              type="hidden"
              name="nivel"
              value={campos.nivel || calc.dados.processoId}
            />
            <input type="hidden" name="tipo" value={campos.tipoAtividadeId} />
            <input
              type="hidden"
              name="tribunal"
              value={campos.tribunalId ?? ""}
            />
            <input type="hidden" name="evento_tipo" value={campos.eventoTipo} />
            <input type="hidden" name="evento_data" value={campos.eventoData} />
            <input
              type="hidden"
              name="dobro"
              value={campos.dobro ? "1" : ""}
            />
            <input
              type="hidden"
              name="dias"
              value={
                campos.diasInformado
                  ? String(campos.diasInformado)
                  : String(calc.dados.dias)
              }
            />
            <input type="hidden" name="titulo" value={campos.titulo} />
            <button type="submit" className="botao-primario h-[42px]">
              Salvar prazo
            </button>
            <span className="text-xs text-texto-secundario">
              As datas serão recalculadas do zero ao salvar. Você poderá
              ajustá-las manualmente depois, sempre com motivo (histórico do
              prazo).
            </span>
          </form>
        </MemoriaCalculoPainel>
      ) : (
        <div className="card flex flex-col gap-2 p-6">
          <h2 className="titulo-secao">Memória de cálculo</h2>
          <p className="text-sm text-texto-secundario">
            {calc && !calc.ok
              ? calc.erro
              : "Preencha pasta, tipo de prazo e a data do evento, depois clique em “Calcular prazo”."}
          </p>
        </div>
      )}
    </div>
  );
}
