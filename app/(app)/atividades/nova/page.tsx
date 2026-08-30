import Link from "next/link";
import { redirect } from "next/navigation";
import { exigirSessao } from "@/lib/supabase/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { hojeNoBrasil } from "@/lib/hoje";
import { MemoriaCalculoPainel } from "@/components/MemoriaCalculo";
import { listarPastas } from "@/lib/db/pastas";
import { listarProcessosDaPasta } from "@/lib/db/processos";
import { listarTiposDeAtividade } from "@/lib/db/tipos-atividade";
import { listarTribunais } from "@/lib/db/tribunais";
import { lerCampos, calcular, EVENTOS, type CalculoPronto } from "./calculo";
import { salvarPrazo } from "./acoes";

export default async function PaginaNovoPrazo({
  searchParams,
}: PageProps<"/atividades/nova">) {
  const sessao = await exigirSessao();
  const supabase = await criarClienteServidor();
  const params = await searchParams;

  const get = (k: string) => {
    const v = params[k];
    return typeof v === "string" ? v : null;
  };
  const campos = lerCampos(get);
  const erro = get("erro");

  const [pastas, tipos, tribunais] = await Promise.all([
    listarPastas(supabase, sessao.escritorioId),
    listarTiposDeAtividade(supabase, sessao.escritorioId, "prazo"),
    listarTribunais(supabase, sessao.escritorioId),
  ]);

  if (pastas.length === 0) {
    redirect("/clientes/novo");
  }

  // Nível da atividade: na Etapa 1 usamos o processo 'geral' da pasta (§4.A.3).
  let processoGeralId = "";
  if (campos.pastaId) {
    const processos = await listarProcessosDaPasta(supabase, campos.pastaId);
    processoGeralId = processos.find((p) => p.tipo === "geral")?.id ?? "";
  }

  // Preview: só calcula quando os campos essenciais estão preenchidos.
  const tentouCalcular = Boolean(
    campos.pastaId && campos.tipoAtividadeId && campos.eventoData,
  );
  const calc =
    tentouCalcular && processoGeralId
      ? await calcular(
          supabase,
          sessao.escritorioId,
          { ...campos, processoId: processoGeralId },
          hojeNoBrasil(),
        )
      : null;

  const tipoSelecionado = tipos.find((t) => t.id === campos.tipoAtividadeId);
  const diasPlaceholder =
    tipoSelecionado?.dias_padrao != null
      ? `padrão do tipo: ${tipoSelecionado.dias_padrao}`
      : "informe os dias";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Link href="/agenda" className="link-acao self-start">
          ← Voltar para a agenda
        </Link>
        <h1 className="titulo-pagina">Novo prazo</h1>
        <p className="subtitulo-pagina">
          O cálculo de prazo fatal e interno aparece ao lado e pode ser
          conferido antes de salvar.
        </p>
      </div>

      <div className="grid items-start gap-5 [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))] max-w-[1180px]">
        {/* ── Formulário (GET → recarrega com a prévia) ─────────────── */}
        <form
          method="get"
          action="/atividades/nova"
          className="card flex flex-col gap-4 p-6"
        >
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
            <span className="text-xs text-texto-secundario">
              Nível: <strong>Geral da pasta</strong> (Etapa 1). Processos
              judiciais entram na Etapa 2.
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

        {/* ── Memória de cálculo ────────────────────────────────────── */}
        {calc && calc.ok ? (
          <PainelMemoria
            dados={calc.dados}
            campos={{ ...campos, processoId: processoGeralId }}
          />
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
    </div>
  );
}

function PainelMemoria({
  dados,
  campos,
}: {
  dados: CalculoPronto;
  campos: ReturnType<typeof lerCampos> & { processoId: string };
}) {
  const { resultado, dias } = dados;

  return (
    <MemoriaCalculoPainel
      memoria={resultado.memoriaCalculo}
      eventoTipo={campos.eventoTipo}
      prazoFatal={resultado.prazoFatalCalculado}
      prazoInterno={resultado.prazoInternoCalculado}
      prazoApertado={resultado.prazoApertado}
      aviso={resultado.avisoCalendarioIncompleto}
    >
      <form action={salvarPrazo} className="flex flex-col gap-3">
        <input type="hidden" name="pasta" value={campos.pastaId} />
        <input type="hidden" name="processo" value={campos.processoId} />
        <input type="hidden" name="tipo" value={campos.tipoAtividadeId} />
        <input type="hidden" name="tribunal" value={campos.tribunalId ?? ""} />
        <input type="hidden" name="evento_tipo" value={campos.eventoTipo} />
        <input type="hidden" name="evento_data" value={campos.eventoData} />
        <input type="hidden" name="dobro" value={campos.dobro ? "1" : ""} />
        <input
          type="hidden"
          name="dias"
          value={
            campos.diasInformado ? String(campos.diasInformado) : String(dias)
          }
        />
        <input type="hidden" name="titulo" value={campos.titulo} />
        <button type="submit" className="botao-primario h-[42px]">
          Salvar prazo
        </button>
        <span className="text-xs text-texto-secundario">
          As datas serão recalculadas do zero ao salvar. Você poderá ajustá-las
          manualmente depois, sempre com motivo (histórico do prazo).
        </span>
      </form>
    </MemoriaCalculoPainel>
  );
}
