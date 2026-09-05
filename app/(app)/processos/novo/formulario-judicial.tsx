"use client";

import { useRef, useState } from "react";
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

type RespostaDatajud = { campos?: CamposSugeridosDatajud; erro?: string };

export function FormularioJudicial({
  pastas,
  valoresIniciais,
  erro,
  retorno,
  hrefCriarPasta,
}: {
  pastas: PastaResumo[];
  valoresIniciais: Record<string, string>;
  erro: string | null;
  retorno: string | null;
  hrefCriarPasta: string;
}) {
  const vi = valoresIniciais;
  const [f, setF] = useState({
    pasta: vi.pasta ?? "",
    numero: vi.numero ?? "",
    tribunal_codigo: vi.tribunal_codigo ?? "",
    vara: vi.vara ?? "",
    comarca: vi.comarca ?? "",
    instancia: vi.instancia ?? "",
    tipo_acao: vi.tipo_acao ?? "",
    fase: vi.fase ?? "",
    polo: vi.polo ?? "",
    valor_causa: vi.valor_causa ?? "",
    data_distribuicao: vi.data_distribuicao ?? "",
  });
  const set = (k: keyof typeof f, v: string) =>
    setF((s) => ({ ...s, [k]: v }));

  const [dj, setDj] = useState<RespostaDatajud | null>(null);
  const [buscando, setBuscando] = useState(false);
  const ultimoBuscado = useRef("");

  const analise = f.numero ? analisarCnj(f.numero) : null;
  const ehCnj = analise?.ok ?? false;
  const tribunalDoNumero = analise?.ok
    ? identificarTribunal(analise.cnj.partes)
    : null;

  // Ao sair do campo do número: sincroniza o tribunal e (se for CNJ) consulta
  // o DataJud, preenchendo só os campos que o usuário ainda não digitou.
  function reconhecerNumero() {
    const a = f.numero.trim() ? analisarCnj(f.numero) : null;
    if (!a?.ok) {
      setDj(null);
      ultimoBuscado.current = "";
      return;
    }

    const t = identificarTribunal(a.cnj.partes);
    if (t) set("tribunal_codigo", String(t.codigo));

    const digitos = a.cnj.formatado.replace(/\D/g, "");
    if (digitos === ultimoBuscado.current) return;
    ultimoBuscado.current = digitos;

    setBuscando(true);
    setDj(null);
    fetch(`/api/datajud?numero=${digitos}`)
      .then((r) => r.json() as Promise<RespostaDatajud>)
      .then((res) => {
        setDj(res);
        if (res.campos) {
          const c = res.campos;
          setF((s) => ({
            ...s,
            vara: s.vara || c.vara || "",
            comarca: s.comarca || c.comarca || "",
            instancia: s.instancia || c.instancia || "",
            tipo_acao: s.tipo_acao || c.tipoAcao || "",
            data_distribuicao:
              s.data_distribuicao || c.dataDistribuicao || "",
          }));
        }
      })
      .catch(() =>
        setDj({ erro: "Não deu para consultar o DataJud agora." }),
      )
      .finally(() => setBuscando(false));
  }

  return (
    <form action={salvarProcessoJudicial}>
      <input type="hidden" name="tipo" value="judicial" />
      {vi.publicacao && (
        <input type="hidden" name="publicacao" value={vi.publicacao} />
      )}
      {retorno && <input type="hidden" name="retorno" value={retorno} />}

      <div className="grid items-start gap-5 [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))] max-w-[1000px]">
        {/* Campos */}
        <div className="card flex flex-col gap-4 p-6">
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
              value={f.pasta}
              onChange={(e) => set("pasta", e.target.value)}
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
              value={f.numero}
              onChange={(e) => set("numero", e.target.value)}
              onBlur={reconhecerNumero}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  reconhecerNumero();
                }
              }}
              placeholder="CNJ, REsp, RE, AREsp, número antigo…"
              className="campo tabular-nums"
            />
            <span className="text-xs text-texto-secundario">
              Se for um CNJ, o tribunal é reconhecido pelo número ao sair do
              campo, e o DataJud é consultado.
            </span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="rotulo">
              Tribunal
              {ehCnj ? " (pelo número — mude se estiver errado)" : ""}
            </span>
            <select
              name="tribunal_codigo"
              required
              value={f.tribunal_codigo}
              onChange={(e) => set("tribunal_codigo", e.target.value)}
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

          <div className="grid gap-4 [grid-template-columns:1fr_1fr]">
            <label className="flex flex-col gap-1.5">
              <span className="rotulo">Vara</span>
              <input
                name="vara"
                value={f.vara}
                onChange={(e) => set("vara", e.target.value)}
                className="campo"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="rotulo">Comarca</span>
              <input
                name="comarca"
                value={f.comarca}
                onChange={(e) => set("comarca", e.target.value)}
                className="campo"
              />
            </label>
          </div>

          <div className="grid gap-4 [grid-template-columns:1fr_1fr]">
            <label className="flex flex-col gap-1.5">
              <span className="rotulo">Instância</span>
              <input
                name="instancia"
                value={f.instancia}
                onChange={(e) => set("instancia", e.target.value)}
                placeholder="1º grau, 2º grau…"
                className="campo"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="rotulo">Classe / tipo de ação</span>
              <input
                name="tipo_acao"
                value={f.tipo_acao}
                onChange={(e) => set("tipo_acao", e.target.value)}
                className="campo"
              />
            </label>
          </div>

          <div className="grid gap-4 [grid-template-columns:1fr_1fr]">
            <label className="flex flex-col gap-1.5">
              <span className="rotulo">Fase atual</span>
              <input
                name="fase"
                value={f.fase}
                onChange={(e) => set("fase", e.target.value)}
                className="campo"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="rotulo">Nosso polo</span>
              <select
                name="polo"
                value={f.polo}
                onChange={(e) => set("polo", e.target.value)}
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
                value={f.valor_causa}
                onChange={(e) => set("valor_causa", e.target.value)}
                className="campo"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="rotulo">Data de distribuição</span>
              <input
                type="date"
                name="data_distribuicao"
                value={f.data_distribuicao}
                onChange={(e) => set("data_distribuicao", e.target.value)}
                className="campo"
              />
            </label>
          </div>
        </div>

        {/* Reconhecimento do número + salvar */}
        <div className="card flex flex-col gap-4 p-6">
          <h2 className="titulo-secao">Número</h2>

          {!f.numero.trim() ? (
            <p className="text-sm text-texto-secundario">
              Digite o número. Se for um CNJ, o sistema valida o dígito
              verificador (Resolução CNJ 65/2008), identifica o tribunal e
              consulta o DataJud ao sair do campo.
            </p>
          ) : ehCnj && analise?.ok ? (
            <>
              <div className="flex flex-col gap-1 rounded-lg border border-tint-2 bg-fundo p-3.5">
                <span className="text-lg font-semibold tabular-nums">
                  {analise.cnj.formatado}
                </span>
                <span className="text-[13px]">
                  {tribunalDoNumero ? (
                    <>
                      <strong>{tribunalDoNumero.sigla}</strong> —{" "}
                      {tribunalDoNumero.nome}
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
                  ⚠ O dígito verificador <strong>não confere</strong> — confira
                  se digitou certo. Você ainda pode salvar assim; fica marcado
                  no processo.
                </p>
              )}

              {buscando && (
                <p className="text-[13px] text-texto-secundario">
                  Consultando o DataJud…
                </p>
              )}
              {dj?.erro && (
                <p className="rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-3.5 py-2.5 text-[13px] text-[#92400E]">
                  {dj.erro}
                </p>
              )}
              {dj?.campos && (
                <div className="flex flex-col gap-1 rounded-lg border border-cumprido bg-[#F0FDF4] p-3.5 text-[13px] text-[#166534]">
                  <span className="font-semibold">✓ Encontrado no DataJud</span>
                  {dj.campos.tipoAcao && (
                    <span>Classe: {dj.campos.tipoAcao}</span>
                  )}
                  {dj.campos.vara && <span>Órgão: {dj.campos.vara}</span>}
                  {dj.campos.comarca && (
                    <span>Comarca: {dj.campos.comarca}</span>
                  )}
                  {dj.campos.instancia && (
                    <span>Instância: {dj.campos.instancia}</span>
                  )}
                  {dj.campos.dataDistribuicao && (
                    <span>Distribuição: {dj.campos.dataDistribuicao}</span>
                  )}
                  <span className="text-[12px] opacity-80">
                    Os campos vazios foram preenchidos — confira e ajuste antes
                    de salvar.
                  </span>
                </div>
              )}
            </>
          ) : (
            <p className="rounded-lg border border-tint-2 bg-fundo px-3.5 py-2.5 text-[13px] text-texto-secundario">
              <strong>{f.numero}</strong> não está no padrão CNJ (REsp, RE,
              número antigo…). Escolha o tribunal na lista. O DataJud só consulta
              por CNJ.
            </p>
          )}

          <div className="h-px bg-tint-2" />
          <div className="flex flex-wrap gap-3">
            <BotaoEnviar className="botao-primario h-[42px]">
              Salvar processo
            </BotaoEnviar>
            <Link
              href={(retorno ?? "/processos") as Route}
              className="flex h-[42px] items-center rounded-lg border border-tint-3 bg-white px-4 text-sm font-medium"
            >
              Cancelar
            </Link>
          </div>
        </div>
      </div>
    </form>
  );
}
