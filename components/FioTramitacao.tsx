import Link from "next/link";
import type { Route } from "next";
import { formatarDataBR } from "@/lib/domain/datas";
import type { AndamentoItem } from "@/lib/db/andamentos";
import { BotaoEnviar } from "@/components/BotaoEnviar";

// O fio cronológico da Tramitação: lista os andamentos do mais antigo pro mais
// recente (o novo fica embaixo, como o protótipo) e, no rodapé, um textarea pra
// postar uma anotação manual. Sem filtro, sem anexo (fora do escopo da fatia).

const ROTULO_ORIGEM: Record<AndamentoItem["origem"], string> = {
  manual: "Anotação",
  criacao_atividade: "Atividade criada",
  conclusao_atividade: "Conclusão",
  observacao_atividade: "Anotação",
  ajuste_prazo: "Ajuste de prazo",
  publicacao_djen: "Publicação (DJEN)",
};

function linkDoItem(a: AndamentoItem): { href: Route; texto: string } | null {
  if (a.atividadeId) {
    const nome =
      a.atividadeTipo === "prazo"
        ? "prazo"
        : a.atividadeTipo === "compromisso"
          ? "compromisso"
          : a.atividadeTipo === "monitoramento"
            ? "monitoramento"
            : "atividade";
    return { href: `/agenda/${a.atividadeId}` as Route, texto: `ver ${nome}` };
  }
  if (a.publicacaoId) {
    return {
      href: `/publicacoes/${a.publicacaoId}` as Route,
      texto: "ver publicação",
    };
  }
  return null;
}

export function FioTramitacao({
  andamentos,
  podePostar,
  acaoPostar,
  processos,
  mostrarProcesso = false,
}: {
  andamentos: AndamentoItem[];
  podePostar: boolean;
  acaoPostar: (formData: FormData) => void | Promise<void>;
  // quando presente (visão por pasta), o rodapé mostra um seletor de processo —
  // o 1º da lista é o default (a página passa o "geral" da pasta primeiro)
  processos?: { id: string; rotulo: string }[];
  // mostra o número do processo em cada item (visão por pasta)
  mostrarProcesso?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      {andamentos.length === 0 ? (
        <p className="painel-vazio">Nada registrado na tramitação ainda.</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {andamentos.map((a) => {
            const link = linkDoItem(a);
            return (
              <li key={a.id} className="card flex flex-col gap-1.5 p-4">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-texto-secundario">
                  <span className="rounded bg-fundo px-1.5 py-0.5 text-teal">
                    {ROTULO_ORIGEM[a.origem]}
                  </span>
                  <span>{a.autorNome ?? "Sistema"}</span>
                  <span>·</span>
                  <span>{formatarDataBR(a.criadoEm.slice(0, 10))}</span>
                  {mostrarProcesso && a.processoNumero && (
                    <>
                      <span>·</span>
                      <span className="tabular-nums">{a.processoNumero}</span>
                    </>
                  )}
                  {link && (
                    <Link
                      href={link.href}
                      className="font-medium text-teal hover:underline"
                    >
                      {link.texto}
                    </Link>
                  )}
                </div>
                <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed">
                  {a.texto}
                </p>
              </li>
            );
          })}
        </ol>
      )}

      {podePostar && (
        <form action={acaoPostar} className="card flex flex-col gap-3 p-4">
          {processos && processos.length > 0 && (
            <label className="flex flex-col gap-1.5">
              <span className="rotulo">Processo</span>
              <select
                name="processo_id"
                className="campo"
                defaultValue={processos[0].id}
              >
                {processos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.rotulo}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="flex flex-col gap-1.5">
            <span className="rotulo">Nova anotação</span>
            <textarea
              name="texto"
              required
              rows={3}
              placeholder="O que aconteceu no caso…"
              className="campo"
            />
          </label>
          <BotaoEnviar className="botao-primario h-[38px] self-start">
            Registrar
          </BotaoEnviar>
        </form>
      )}
    </div>
  );
}
