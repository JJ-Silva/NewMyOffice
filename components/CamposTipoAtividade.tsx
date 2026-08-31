"use client";

import { useState } from "react";

// Campos de um tipo de atividade. Os específicos de PRAZO (dias, natureza,
// exige peça, categoria) só aparecem quando "Aplica-se a = Prazo".
// Client-side só para mostrar/esconder — a normalização de verdade é no servidor.

const NATUREZAS = [
  { valor: "processual", label: "Processual (calcula com tribunal/feriados)" },
  { valor: "interna", label: "Interna (dias úteis, tribunal opcional)" },
  { valor: "material", label: "Material (você informa a data direto)" },
];

const CATEGORIAS = [
  "resposta",
  "recurso",
  "manifestacao",
  "cumprimento",
  "providencia_interna",
];

export function CamposTipoAtividade({
  idDatalist,
  nome = "",
  aplicaA = "prazo",
  diasPadrao = null,
  natureza = "processual",
  exigePeca = false,
  categoria = "",
}: {
  idDatalist: string;
  nome?: string;
  aplicaA?: "prazo" | "compromisso" | "monitoramento";
  diasPadrao?: number | null;
  natureza?: string | null;
  exigePeca?: boolean;
  categoria?: string | null;
}) {
  const [tipo, setTipo] = useState(aplicaA);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="grid items-end gap-2.5 [grid-template-columns:1fr_190px]">
        <label className="flex min-w-0 flex-col gap-1.5">
          <span className="rotulo">Nome</span>
          <input
            name="nome"
            required
            defaultValue={nome}
            placeholder="Ex.: Contestação"
            className="campo"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="rotulo">Aplica-se a</span>
          <select
            name="aplica_a"
            value={tipo}
            onChange={(e) =>
              setTipo(
                e.target.value as "prazo" | "compromisso" | "monitoramento",
              )
            }
            className="campo"
          >
            <option value="prazo">Prazo</option>
            <option value="compromisso">Compromisso</option>
            <option value="monitoramento">Monitoramento</option>
          </select>
        </label>
      </div>

      {tipo === "prazo" && (
        <div className="flex flex-col gap-2.5 rounded-lg border border-tint-2 bg-fundo p-3">
          <div className="grid items-end gap-2.5 [grid-template-columns:110px_1fr]">
            <label className="flex flex-col gap-1.5">
              <span className="rotulo">Dias padrão</span>
              <input
                type="number"
                name="dias_padrao"
                min={1}
                defaultValue={diasPadrao ?? ""}
                placeholder="15"
                className="campo"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="rotulo">Natureza</span>
              <select
                name="natureza"
                defaultValue={natureza ?? "processual"}
                className="campo"
              >
                {NATUREZAS.map((x) => (
                  <option key={x.valor} value={x.valor}>
                    {x.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid items-end gap-2.5 [grid-template-columns:1fr_auto]">
            <label className="flex flex-col gap-1.5">
              <span className="rotulo">Categoria (opcional)</span>
              <input
                name="categoria"
                list={idDatalist}
                defaultValue={categoria ?? ""}
                placeholder="recurso, resposta…"
                className="campo"
              />
              <datalist id={idDatalist}>
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </label>
            <label className="flex items-center gap-2 pb-2 text-[13px]">
              <input
                type="checkbox"
                name="exige_peca"
                value="1"
                defaultChecked={exigePeca}
              />
              Exige peça
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
