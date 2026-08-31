import Link from "next/link";
import { notFound } from "next/navigation";
import type { Route } from "next";
import { exigirSessao } from "@/lib/supabase/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { formatarDataBR } from "@/lib/domain/datas";
import { sugerirPrazo } from "@/lib/domain/publicacao";
import { buscarPublicacao } from "@/lib/db/publicacoes";
import { listarProcessos } from "@/lib/db/processos";
import { listarTiposDeAtividade } from "@/lib/db/tipos-atividade";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { arquivar, reabrir, vincularProcessoJudicial } from "../acoes";

export default async function PaginaTriagem({
  params,
  searchParams,
}: PageProps<"/publicacoes/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const erro = typeof sp.erro === "string" ? sp.erro : null;

  const sessao = await exigirSessao();
  const supabase = await criarClienteServidor();
  const p = await buscarPublicacao(supabase, sessao.escritorioId, id);
  if (!p) notFound();

  const sugestao = sugerirPrazo(p.texto);

  const [processos, tiposPrazo] = await Promise.all([
    listarProcessos(supabase, sessao.escritorioId),
    listarTiposDeAtividade(supabase, sessao.escritorioId, "prazo"),
  ]);
  const judiciais = processos.filter((x) => x.tipo === "judicial");

  // Tribunal do processo vinculado (para pré-preencher o calendário do prazo).
  let tribunalIdDoProcesso = "";
  if (p.processoId) {
    const { data } = await supabase
      .from("processo_judicial")
      .select("tribunal_id")
      .eq("processo_id", p.processoId)
      .maybeSingle();
    tribunalIdDoProcesso = (data?.tribunal_id as string | null) ?? "";
  }

  const tipoSugeridoId =
    tiposPrazo.find((t) => t.nome === sugestao.tipoProvavel)?.id ?? "";

  const hrefLancarPrazo = (`/atividades/nova?` +
    new URLSearchParams({
      aba: "prazo",
      pasta: p.pastaId ?? "",
      nivel: p.processoId ?? "",
      tipo: tipoSugeridoId,
      tribunal: tribunalIdDoProcesso,
      evento_tipo: "disponibilizacao_djen",
      evento_data: p.dataDisponibilizacao,
      dias: sugestao.dias ? String(sugestao.dias) : "",
      publicacao: p.id,
    }).toString()) as Route;

  const hrefCadastrarProcesso = (`/processos/novo?` +
    new URLSearchParams({
      tipo: "judicial",
      cnj: p.cnj ?? p.numeroProcesso ?? "",
      publicacao: p.id,
      retorno: `/publicacoes/${p.id}`,
    }).toString()) as Route;

  const certidaoUrl = p.hash
    ? `https://comunicaapi.pje.jus.br/api/v1/comunicacao/${p.hash}/certidao`
    : null;

  return (
    <div className="flex max-w-[820px] flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Link href="/publicacoes" className="link-acao self-start">
          ← Voltar para publicações
        </Link>
        <span className="text-xs text-texto-secundario">
          {p.siglaTribunal ?? "—"} · {p.nomeOrgao ?? "órgão não informado"} ·{" "}
          disponibilizado em {formatarDataBR(p.dataDisponibilizacao)}
        </span>
        <h1 className="titulo-pagina">
          {p.tipoComunicacao ?? "Publicação"}
          {p.nomeClasse ? ` — ${p.nomeClasse}` : ""}
        </h1>
        {p.cnj && (
          <span className="text-sm tabular-nums text-texto-secundario">
            {p.cnj}
          </span>
        )}
      </div>

      {erro && (
        <p className="rounded-lg border border-atrasado bg-[var(--atrasado-fundo)] px-3 py-2 text-sm text-atrasado">
          {erro}
        </p>
      )}

      {/* Texto */}
      <div className="card flex flex-col gap-3 p-5">
        <span className="text-sm font-semibold">Teor da publicação</span>
        <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed">
          {p.texto}
        </p>
        <div className="flex flex-wrap gap-4 text-xs text-texto-secundario">
          {certidaoUrl && (
            <a
              href={certidaoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="link-acao"
            >
              Certidão (PDF)
            </a>
          )}
          {p.link && (
            <a
              href={p.link}
              target="_blank"
              rel="noopener noreferrer"
              className="link-acao"
            >
              Ver no tribunal
            </a>
          )}
        </div>
      </div>

      {/* Já triada */}
      {p.status === "virou_prazo" && (
        <div className="card flex flex-col gap-2 p-5">
          <span className="text-sm font-semibold text-cumprido">
            ✓ Esta publicação virou um prazo.
          </span>
          {p.atividadeId && (
            <Link href={`/agenda/${p.atividadeId}`} className="link-acao">
              Abrir o prazo na agenda →
            </Link>
          )}
        </div>
      )}

      {p.status === "descartada" && (
        <div className="card flex flex-col gap-3 p-5">
          <span className="text-sm font-semibold">Arquivada</span>
          <p className="text-[13px] italic text-texto-secundario">
            {p.motivoDescarte ? `“${p.motivoDescarte}”` : "Sem justificativa."}
          </p>
          <form action={reabrir}>
            <input type="hidden" name="id" value={p.id} />
            <BotaoEnviar className="botao-secundario h-[34px]" rotuloOcupado="…">
              Reabrir para triar
            </BotaoEnviar>
          </form>
        </div>
      )}

      {/* Triagem */}
      {p.status === "nova" && (
        <>
          {/* Passo 1 — processo */}
          <div className="card flex flex-col gap-3 p-5">
            <span className="text-sm font-semibold">1 · Processo</span>
            {p.processoId ? (
              <p className="rounded-lg border border-cumprido bg-[#F0FDF4] px-3.5 py-2.5 text-[13px] text-[#166534]">
                ✓ Vinculada a{" "}
                <strong>{p.pastaNome ?? p.pastaCodigo}</strong> ·{" "}
                {p.clienteNome ?? "sem cliente"}
                {p.processoNumero ? ` · ${p.processoNumero}` : " · geral da pasta"}
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-[13px] text-texto-secundario">
                  {p.cnj
                    ? "Nenhum processo judicial cadastrado com este CNJ."
                    : "A publicação não traz número de processo reconhecível."}{" "}
                  Uma publicação do DJEN sempre se liga a um processo judicial.
                </p>

                <Link
                  href={hrefCadastrarProcesso}
                  className="botao-primario h-[38px] self-start"
                >
                  Cadastrar processo judicial
                </Link>

                {judiciais.length > 0 && (
                  <>
                    <div className="flex items-center gap-3 text-xs text-texto-secundario">
                      <span className="h-px flex-1 bg-tint-2" />
                      ou, se já existe
                      <span className="h-px flex-1 bg-tint-2" />
                    </div>

                    <form
                      action={vincularProcessoJudicial}
                      className="flex flex-wrap items-end gap-2"
                    >
                      <input type="hidden" name="id" value={p.id} />
                      <label className="flex flex-col gap-1.5">
                        <span className="rotulo">
                          Vincular a um processo judicial já cadastrado
                        </span>
                        <select
                          name="processo_id"
                          required
                          defaultValue=""
                          className="campo w-[360px]"
                        >
                          <option value="" disabled>
                            Selecione o processo…
                          </option>
                          {judiciais.map((x) => (
                            <option key={x.id} value={x.id}>
                              {(x.numero ?? "sem número") +
                                ` · ${x.pastaNome ?? x.pastaCodigo}` +
                                (x.clienteNome ? ` · ${x.clienteNome}` : "")}
                            </option>
                          ))}
                        </select>
                      </label>
                      <BotaoEnviar
                        className="botao-secundario h-[38px]"
                        rotuloOcupado="…"
                      >
                        Vincular
                      </BotaoEnviar>
                    </form>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Passo 2 — virar prazo */}
          <div className="card flex flex-col gap-3 p-5">
            <span className="text-sm font-semibold">2 · Virar prazo</span>
            <p className="rounded-lg border border-tint-2 bg-fundo px-3.5 py-2.5 text-[13px]">
              {sugestao.explicacao}
            </p>
            {p.processoId ? (
              <Link
                href={hrefLancarPrazo}
                className="botao-primario h-[38px] self-start"
              >
                Lançar o prazo →
              </Link>
            ) : (
              <span className="text-[13px] text-texto-secundario">
                Vincule ou cadastre o processo primeiro.
              </span>
            )}
            <span className="text-xs text-texto-secundario">
              A data da disponibilização ({formatarDataBR(p.dataDisponibilizacao)}
              ) entra como termo inicial (dia 1). O motor calcula o prazo fatal e
              o interno; você confere e salva.
            </span>
          </div>

          {/* Arquivar */}
          <details className="text-sm">
            <summary className="cursor-pointer text-texto-secundario">
              Arquivar (não gera prazo)
            </summary>
            <form action={arquivar} className="mt-2 flex items-end gap-2">
              <input type="hidden" name="id" value={p.id} />
              <label className="flex flex-col gap-1.5">
                <span className="rotulo">Justificativa (opcional)</span>
                <input
                  name="motivo"
                  placeholder="Ex.: intimação só informativa"
                  className="campo w-[320px]"
                />
              </label>
              <BotaoEnviar className="botao-perigo h-[38px]" rotuloOcupado="…">
                Arquivar
              </BotaoEnviar>
            </form>
          </details>
        </>
      )}
    </div>
  );
}
