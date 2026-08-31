import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirSessao } from "@/lib/supabase/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { hojeNoBrasil } from "@/lib/hoje";
import { formatarDataBR } from "@/lib/domain/datas";
import { estadoNaAgenda } from "@/lib/domain/atividade";
import { MemoriaCalculoPainel } from "@/components/MemoriaCalculo";
import { carregarDetalheAtividade } from "@/lib/db/atividade-detalhe";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import {
  concluir,
  reativar,
  cancelar,
  anotar,
  ajustarPrazo,
  verificar,
} from "../acoes";

const ESTADO_LABEL: Record<string, string> = {
  atrasada: "Atrasada",
  vence_hoje: "Vence hoje",
  hora_de_fazer: "Hora de fazer",
  futura: "No prazo",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

const TIPO_LABEL = {
  prazo: "Prazo",
  compromisso: "Compromisso",
  monitoramento: "Monitoramento",
} as const;

function dataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  });
}

export default async function PaginaDetalheAtividade({
  params,
  searchParams,
}: PageProps<"/agenda/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const erro = typeof sp.erro === "string" ? sp.erro : null;

  const sessao = await exigirSessao();
  const supabase = await criarClienteServidor();
  const d = await carregarDetalheAtividade(supabase, sessao.escritorioId, id);
  if (!d) {
    notFound();
  }

  const hoje = hojeNoBrasil();
  const prazo = d.prazo;
  const estado = estadoNaAgenda(
    {
      status: d.status,
      data: d.data,
      prazoInterno: prazo?.prazoInterno ?? null,
    },
    hoje,
  );
  const aberta = d.status === "pendente" || d.status === "em_andamento";
  const rotuloData =
    d.tipo === "prazo"
      ? "Prazo fatal (adotado)"
      : d.tipo === "compromisso"
        ? "Data do compromisso"
        : "Dia da verificação";

  return (
    <div className="flex max-w-[820px] flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Link href="/agenda" className="link-acao self-start">
          ← Voltar para a agenda
        </Link>
        <span className="text-sm font-semibold text-texto">
          {d.pastaNome ?? d.pastaCodigo}
        </span>
        <span className="text-xs tabular-nums text-texto-secundario">
          {d.processoTipo !== "geral" && "⚖ "}
          {d.processoNumero ?? d.pastaCodigo}
          {d.processoTipo === "judicial"
            ? " · judicial"
            : d.processoTipo === "administrativo"
              ? " · administrativo"
              : " · geral da pasta"}{" "}
          · {d.clienteNome ?? "sem cliente"}
        </span>
        <h1 className="titulo-pagina">
          {TIPO_LABEL[d.tipo]}: {d.titulo}
        </h1>
        {d.recorrenciaId && (
          <span className="text-xs text-teal">
            ↻ Parte de uma recorrência —{" "}
            <Link href="/recorrencias" className="underline">
              ver a série
            </Link>
          </span>
        )}
      </div>

      {erro && (
        <p className="rounded-lg border border-atrasado bg-[var(--atrasado-fundo)] px-3 py-2 text-sm text-atrasado">
          {erro}
        </p>
      )}

      {/* Datas + situação */}
      <div className="grid gap-3 [grid-template-columns:1fr_1fr_1fr]">
        <div className="card flex flex-col gap-1 p-3.5">
          <span className="rotulo">{rotuloData}</span>
          <span className="text-lg font-semibold tabular-nums text-atrasado">
            {formatarDataBR(d.data)}
          </span>
          {prazo &&
            prazo.prazoFatalCalculado &&
            prazo.prazoFatalCalculado !== d.data && (
              <span className="text-xs text-texto-secundario">
                sistema calculou {formatarDataBR(prazo.prazoFatalCalculado)}
              </span>
            )}
          {d.tipo === "compromisso" && d.compromisso?.hora && (
            <span className="text-xs text-texto-secundario">
              às {d.compromisso.hora.slice(0, 5)}
            </span>
          )}
        </div>
        <div className="card flex flex-col gap-1 p-3.5">
          {d.tipo === "prazo" ? (
            <>
              <span className="rotulo">Prazo interno (adotado)</span>
              <span className="text-lg font-semibold tabular-nums text-aviso">
                {prazo ? formatarDataBR(prazo.prazoInterno) : "—"}
              </span>
              {prazo &&
                prazo.prazoInternoCalculado &&
                prazo.prazoInternoCalculado !== prazo.prazoInterno && (
                  <span className="text-xs text-texto-secundario">
                    sistema calculou{" "}
                    {formatarDataBR(prazo.prazoInternoCalculado)}
                  </span>
                )}
            </>
          ) : d.tipo === "monitoramento" ? (
            <>
              <span className="rotulo">Última verificação</span>
              <span className="text-base font-semibold">
                {d.monitoramento?.ultimaVerificacao
                  ? dataHora(d.monitoramento.ultimaVerificacao)
                  : "ainda não verificado"}
              </span>
            </>
          ) : (
            <>
              <span className="rotulo">Duração estimada</span>
              <span className="text-base font-semibold">
                {d.compromisso?.duracaoEstimadaMin
                  ? `${d.compromisso.duracaoEstimadaMin} min`
                  : "—"}
              </span>
            </>
          )}
        </div>
        <div className="card flex flex-col gap-1 p-3.5">
          <span className="rotulo">Situação</span>
          <span className="text-base font-semibold">
            {ESTADO_LABEL[estado] ?? estado}
          </span>
          {prazo?.prazoApertado && (
            <span className="text-xs text-aviso">prazo apertado</span>
          )}
        </div>
      </div>

      {/* Detalhe do compromisso */}
      {d.tipo === "compromisso" && d.compromisso?.local && (
        <p className="rounded-lg border border-tint-2 bg-tint-1 px-3.5 py-2.5 text-[13px]">
          Local: <strong>{d.compromisso.local}</strong>
        </p>
      )}

      {/* Detalhe do monitoramento */}
      {d.tipo === "monitoramento" && d.monitoramento?.alvo && (
        <p className="rounded-lg border border-tint-2 bg-tint-1 px-3.5 py-2.5 text-[13px]">
          Alvo: <strong>{d.monitoramento.alvo}</strong>
        </p>
      )}

      {prazo?.motivoAjuste && (
        <p className="rounded-lg border border-tint-2 bg-tint-1 px-3.5 py-2.5 text-[13px] text-texto-secundario">
          Datas ajustadas manualmente. Motivo do último ajuste:{" "}
          <em>{prazo.motivoAjuste}</em>
        </p>
      )}

      {/* Memória de cálculo (só prazo) */}
      {prazo?.memoriaCalculo && (
        <MemoriaCalculoPainel
          memoria={prazo.memoriaCalculo}
          eventoTipo={prazo.eventoTipo}
          prazoFatal={prazo.memoriaCalculo.prazoFatalCalculado}
          prazoInterno={prazo.memoriaCalculo.prazoInternoCalculado}
          prazoApertado={prazo.memoriaCalculo.prazoApertado}
        />
      )}

      {/* Ajustar datas (só prazo) */}
      {prazo && aberta && (
        <details className="card p-5">
          <summary className="cursor-pointer text-sm font-semibold">
            Ajustar datas manualmente
          </summary>
          <form action={ajustarPrazo} className="mt-3 flex flex-col gap-3">
            <input type="hidden" name="id" value={d.id} />
            <div className="grid gap-3 [grid-template-columns:1fr_1fr]">
              <label className="flex flex-col gap-1.5">
                <span className="rotulo">Prazo fatal</span>
                <input
                  type="date"
                  name="prazo_fatal"
                  defaultValue={d.data}
                  className="campo"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="rotulo">Prazo interno</span>
                <input
                  type="date"
                  name="prazo_interno"
                  defaultValue={prazo.prazoInterno}
                  className="campo"
                />
              </label>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="rotulo">Motivo do ajuste (obrigatório)</span>
              <input
                name="motivo"
                required
                placeholder="Ex.: litisconsortes com o mesmo procurador — art. 229 não incide"
                className="campo"
              />
            </label>
            <span className="text-xs text-texto-secundario">
              Fica registrado no histórico do prazo com autor, data e motivo. Se
              você mudar só o fatal, o interno é re-derivado (fatal − margem).
            </span>
            <BotaoEnviar className="botao-primario h-[38px] self-start">
              Salvar ajuste
            </BotaoEnviar>
          </form>
        </details>
      )}

      {/* Anotações */}
      <div className="card flex flex-col gap-3 p-5">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold">Anotações</span>
          <span className="text-xs text-texto-secundario">
            Acompanhamento livre da equipe. Não altera datas nem o cálculo.
          </span>
        </div>
        {d.observacoes.length === 0 ? (
          <span className="text-[13px] text-texto-secundario">
            Nenhuma anotação ainda.
          </span>
        ) : (
          d.observacoes.map((o) => (
            <div
              key={o.id}
              className="border-t border-tint-1 pt-2.5 first:border-0 first:pt-0"
            >
              <span className="text-xs text-texto-secundario">
                {o.autorNome ?? "—"} · {dataHora(o.criado_em)}
              </span>
              <p className="text-sm leading-relaxed">{o.texto}</p>
            </div>
          ))
        )}
        <form action={anotar} className="flex gap-2">
          <input type="hidden" name="id" value={d.id} />
          <input
            name="texto"
            required
            placeholder="Ex.: cliente enviou os documentos por e-mail"
            className="campo flex-1"
          />
          <BotaoEnviar className="botao-primario h-[38px]" rotuloOcupado="…">
            Adicionar
          </BotaoEnviar>
        </form>
      </div>

      {/* Histórico de ajustes */}
      {d.historico.length > 0 && (
        <div className="card flex flex-col gap-2.5 p-5">
          <span className="text-sm font-semibold">Histórico de ajustes</span>
          {d.historico.map((h) => (
            <div
              key={h.id}
              className="flex gap-3 border-t border-tint-1 pt-2.5 first:border-0 first:pt-0"
            >
              <span className="mt-1.5 h-2 w-2 flex-none rounded-full bg-tint-3" />
              <div className="flex flex-col gap-0.5">
                <span className="text-[13.5px]">
                  {rotuloHistorico(h.campo)}: {String(h.valor_anterior)} →{" "}
                  {String(h.valor_novo)}
                </span>
                <span className="text-xs text-texto-secundario">
                  {dataHora(h.alterado_em)} · {h.autorNome ?? "—"}
                </span>
                {h.motivo && (
                  <span className="text-[12.5px] italic text-texto-secundario">
                    “{h.motivo}”
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ações */}
      {aberta ? (
        d.tipo === "monitoramento" ? (
          <form
            action={verificar}
            className="card flex flex-col gap-3 p-5"
          >
            <span className="text-sm font-semibold">Registrar verificação</span>
            <input type="hidden" name="id" value={d.id} />
            <label className="flex flex-col gap-1.5">
              <span className="rotulo">Resultado</span>
              <input
                name="resultado"
                required
                placeholder="Ex.: nada de novo no andamento / saiu decisão"
                className="campo"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="achou_mudanca" value="1" />
              Encontrei uma mudança (a prioridade sobe e a atividade fica
              pendente)
            </label>
            <span className="text-xs text-texto-secundario">
              Sem mudança e sem recorrência → a atividade é concluída.
            </span>
            <BotaoEnviar className="botao-primario h-[38px] self-start">
              Registrar
            </BotaoEnviar>
          </form>
        ) : (
          <form
            action={concluir}
            className="card flex flex-wrap items-end gap-2 p-5"
          >
            <input type="hidden" name="id" value={d.id} />
            <label className="flex flex-col gap-1.5">
              <span className="rotulo">
                {d.tipo === "prazo"
                  ? "Como foi cumprido (opcional)"
                  : "Observação (opcional)"}
              </span>
              <input name="observacao" className="campo w-[280px]" />
            </label>
            <BotaoEnviar
              className="botao-primario h-[38px]"
              rotuloOcupado="Concluindo…"
              style={{ background: "var(--cumprido)", color: "#fff" }}
            >
              {d.tipo === "prazo"
                ? "Marcar como cumprido"
                : "Marcar como realizado"}
            </BotaoEnviar>
          </form>
        )
      ) : (
        <form action={reativar}>
          <input type="hidden" name="id" value={d.id} />
          <BotaoEnviar className="botao-secundario h-[38px]" rotuloOcupado="…">
            Reativar
          </BotaoEnviar>
        </form>
      )}

      {aberta && (
        <details className="text-sm">
          <summary className="cursor-pointer text-texto-secundario">
            Cancelar esta atividade
          </summary>
          <form action={cancelar} className="mt-2 flex items-end gap-2">
            <input type="hidden" name="id" value={d.id} />
            <label className="flex flex-col gap-1.5">
              <span className="rotulo">Motivo do cancelamento</span>
              <input name="motivo" required className="campo w-[320px]" />
            </label>
            <BotaoEnviar className="botao-perigo h-[38px]" rotuloOcupado="…">
              Cancelar atividade
            </BotaoEnviar>
          </form>
        </details>
      )}

      {d.status === "concluida" && d.observacaoConclusao && (
        <p className="text-[13px] text-texto-secundario">
          Concluída em{" "}
          {d.dataConclusao ? formatarDataBR(d.dataConclusao) : "—"}:{" "}
          {d.observacaoConclusao}
        </p>
      )}
    </div>
  );
}

function rotuloHistorico(campo: string): string {
  const map: Record<string, string> = {
    prazo_fatal: "Prazo fatal",
    prazo_interno: "Prazo interno",
    evento_data: "Data do evento",
    evento_tipo: "Tipo de evento",
    status: "Status",
  };
  return map[campo] ?? campo;
}
