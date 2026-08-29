import Link from "next/link";
import { redirect } from "next/navigation";
import { exigirSessao } from "@/lib/supabase/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { hojeNoBrasil } from "@/lib/hoje";
import { formatarDataBR, nomeDoDiaDaSemana } from "@/lib/domain/datas";
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
  const { resultado, dias, margem, natureza } = dados;
  const m = resultado.memoriaCalculo;
  const eventoLabel =
    EVENTOS.find((e) => e.valor === campos.eventoTipo)?.label ?? "evento";

  const passos: string[] = [];
  if (m.dia1 === m.dataInicial) {
    passos.push(
      `${eventoLabel} em ${formatarDataBR(m.dataInicial)} — contado como o dia 1 (Opção A: não se exclui o dia do começo).`,
    );
  } else {
    passos.push(
      `${eventoLabel} em ${formatarDataBR(m.dataInicial)}; como não é dia útil, o dia 1 passa a ser ${formatarDataBR(m.dia1)} (${nomeDoDiaDaSemana(m.dia1)}).`,
    );
  }
  passos.push(
    m.dobro
      ? `Contagem de ${m.nDias} dias úteis (prazo em dobro: ${m.nDiasInformado} × 2).`
      : `Contagem de ${m.nDias} dias úteis.`,
  );
  if (m.diasPulados.length > 0) {
    const amostra = m.diasPulados
      .slice(0, 4)
      .map((d) => `${formatarDataBR(d.data)} (${d.motivo})`)
      .join("; ");
    passos.push(
      `Dias não úteis pulados no caminho: ${amostra}${m.diasPulados.length > 4 ? ` e mais ${m.diasPulados.length - 4}` : ""}.`,
    );
  }
  passos.push(
    `Prazo fatal = ${formatarDataBR(m.prazoFatalCalculado)} (${nomeDoDiaDaSemana(m.prazoFatalCalculado)}).`,
  );
  passos.push(
    m.prazoApertado
      ? `Prazo interno: ${dias} − ${margem} dias de margem ≤ 0 → interno = ${formatarDataBR(m.prazoInternoCalculado)} e o prazo fica marcado como apertado.`
      : `Prazo interno = prazo fatal − ${margem} dias úteis = ${formatarDataBR(m.prazoInternoCalculado)} (${nomeDoDiaDaSemana(m.prazoInternoCalculado)}).`,
  );

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between bg-teal px-5 py-4">
        <h2 className="text-base font-semibold text-white">
          Memória de cálculo
        </h2>
        <span className="text-[11.5px] font-medium text-white/65">
          cálculo automático
        </span>
      </div>

      <div className="flex flex-col gap-4 p-5">
        <div className="grid gap-3.5 [grid-template-columns:1fr_1fr]">
          <div className="flex flex-col gap-1 rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-3.5">
            <span className="text-xs font-medium text-[#991B1B]">
              Prazo fatal
            </span>
            <span className="text-xl font-semibold tabular-nums text-[#DC2626]">
              {formatarDataBR(resultado.prazoFatalCalculado)}
            </span>
            <span className="text-[11.5px] text-[#B91C1C]">
              {nomeDoDiaDaSemana(resultado.prazoFatalCalculado)}
            </span>
          </div>
          <div className="flex flex-col gap-1 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] p-3.5">
            <span className="text-xs font-medium text-[#92400E]">
              Prazo interno
            </span>
            <span className="text-xl font-semibold tabular-nums text-[#D97706]">
              {formatarDataBR(resultado.prazoInternoCalculado)}
            </span>
            <span className="text-[11.5px] text-[#B45309]">
              {resultado.prazoApertado
                ? "prazo apertado"
                : nomeDoDiaDaSemana(resultado.prazoInternoCalculado)}
            </span>
          </div>
        </div>

        {resultado.avisoCalendarioIncompleto && (
          <div className="flex gap-2.5 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-3.5 py-3">
            <span className="font-bold text-[#B45309]">!</span>
            <span className="text-[12.5px] leading-relaxed text-[#92400E]">
              {resultado.avisoCalendarioIncompleto}
            </span>
          </div>
        )}

        <div className="flex flex-col gap-2 rounded-lg border border-tint-2 bg-fundo p-3.5">
          <span className="rotulo">Como chegamos nessas datas</span>
          {passos.map((texto, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full bg-[#CFE3DF] text-[11px] font-semibold text-teal">
                {i + 1}
              </span>
              <span className="text-[13px] leading-relaxed">{texto}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="rotulo">Base legal</span>
          <span className="text-[13px] leading-relaxed">
            Contagem em dias úteis (CPC art. 219). Opção A do escritório: a
            disponibilização no DJEN é o dia 1 da contagem — cerca de 2 dias
            úteis mais conservador que o CPC art. 224 §§2º–3º.
            {natureza === "processual" && m.marcosCpc && (
              <>
                {" "}
                Marcos informativos: publicação (CPC) em{" "}
                {formatarDataBR(m.marcosCpc.publicacaoCpc)}, início da contagem
                em {formatarDataBR(m.marcosCpc.inicioContagemCpc)}, fatal pelo
                CPC estrito em {formatarDataBR(m.marcosCpc.prazoFatalCpcEstrito)}.
              </>
            )}
          </span>
        </div>

        <div className="h-px bg-tint-2" />

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
            value={campos.diasInformado ? String(campos.diasInformado) : String(dias)}
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
      </div>
    </div>
  );
}
