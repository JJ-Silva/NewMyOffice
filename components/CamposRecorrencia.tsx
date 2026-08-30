"use client";

import { useState } from "react";

// Bloco "Repetir esta atividade" — usado nos formulários de compromisso e
// monitoramento (Etapa 3a). A data-base da recorrência é o campo "data" do
// formulário pai; aqui só entram o padrão de repetição e a condição de fim.
//
// Só client-side para mostrar/esconder os campos. A validação de verdade é no
// servidor (lib/domain/recorrencia.ts → validarRegra), na Server Action.

const DIAS = [
  { valor: 0, curto: "Dom" },
  { valor: 1, curto: "Seg" },
  { valor: 2, curto: "Ter" },
  { valor: 3, curto: "Qua" },
  { valor: 4, curto: "Qui" },
  { valor: 5, curto: "Sex" },
  { valor: 6, curto: "Sáb" },
];

export function CamposRecorrencia({
  rotuloData = "a data acima",
}: {
  rotuloData?: string;
}) {
  const [repetir, setRepetir] = useState(false);
  const [periodicidade, setPeriodicidade] = useState<
    "intervalo" | "semanal" | "mensal"
  >("intervalo");
  const [termino, setTermino] = useState<"indefinido" | "data" | "ocorrencias">(
    "indefinido",
  );

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-tint-2 bg-fundo p-3.5">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          name="repetir"
          value="1"
          checked={repetir}
          onChange={(e) => setRepetir(e.target.checked)}
        />
        Repetir esta atividade
      </label>

      {repetir && (
        <div className="flex flex-col gap-3 border-t border-tint-2 pt-3">
          <span className="text-xs text-texto-secundario">
            A primeira ocorrência é <strong>{rotuloData}</strong>. As seguintes
            são criadas automaticamente conforme a regra.
          </span>

          <label className="flex flex-col gap-1.5">
            <span className="rotulo">Como repete</span>
            <select
              name="rec_periodicidade"
              value={periodicidade}
              onChange={(e) =>
                setPeriodicidade(
                  e.target.value as "intervalo" | "semanal" | "mensal",
                )
              }
              className="campo"
            >
              <option value="intervalo">A cada N dias / semanas / meses</option>
              <option value="semanal">Toda semana, em dias fixos</option>
              <option value="mensal">Todo mês, num dia fixo</option>
            </select>
          </label>

          {periodicidade === "intervalo" && (
            <div className="grid gap-3 [grid-template-columns:110px_1fr]">
              <label className="flex flex-col gap-1.5">
                <span className="rotulo">A cada</span>
                <input
                  type="number"
                  name="rec_intervalo_cada"
                  min={1}
                  defaultValue={1}
                  className="campo"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="rotulo">Unidade</span>
                <select
                  name="rec_intervalo_unidade"
                  defaultValue="semanas"
                  className="campo"
                >
                  <option value="dias">dias</option>
                  <option value="semanas">semanas</option>
                  <option value="meses">meses</option>
                </select>
              </label>
            </div>
          )}

          {periodicidade === "semanal" && (
            <div className="flex flex-col gap-1.5">
              <span className="rotulo">Dias da semana</span>
              <div className="flex flex-wrap gap-1.5">
                {DIAS.map((d) => (
                  <label
                    key={d.valor}
                    className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-tint-3 bg-white px-2.5 py-1.5 text-[13px] has-[:checked]:border-teal has-[:checked]:bg-tint-1"
                  >
                    <input
                      type="checkbox"
                      name="rec_dias_semana"
                      value={d.valor}
                    />
                    {d.curto}
                  </label>
                ))}
              </div>
            </div>
          )}

          {periodicidade === "mensal" && (
            <label className="flex w-[160px] flex-col gap-1.5">
              <span className="rotulo">Dia do mês</span>
              <input
                type="number"
                name="rec_dia_do_mes"
                min={1}
                max={31}
                defaultValue={1}
                className="campo"
              />
              <span className="text-[11px] text-texto-secundario">
                Dia 29–31: nos meses mais curtos cai no último dia.
              </span>
            </label>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="rotulo">Até quando</span>
            <select
              name="rec_termino"
              value={termino}
              onChange={(e) =>
                setTermino(
                  e.target.value as "indefinido" | "data" | "ocorrencias",
                )
              }
              className="campo"
            >
              <option value="indefinido">Sem data de fim (até encerrar)</option>
              <option value="data">Até uma data</option>
              <option value="ocorrencias">Um número de vezes</option>
            </select>
          </label>

          {termino === "data" && (
            <label className="flex w-[200px] flex-col gap-1.5">
              <span className="rotulo">Repetir até</span>
              <input type="date" name="rec_termino_ate" className="campo" />
            </label>
          )}

          {termino === "ocorrencias" && (
            <label className="flex w-[160px] flex-col gap-1.5">
              <span className="rotulo">Número de vezes</span>
              <input
                type="number"
                name="rec_termino_ocorrencias"
                min={1}
                defaultValue={4}
                className="campo"
              />
            </label>
          )}
        </div>
      )}
    </div>
  );
}
