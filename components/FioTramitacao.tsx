"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { Route } from "next";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import type { DiaFio } from "@/lib/tramitacao-fio";

// O fio da Tramitação como um grupo de mensagens: agrupado por dia, balões de
// chat (o autor logado à direita), avatar colorido, hora, chip pro prazo/
// publicação. Rodapé com o compositor. Rola pro fim ao abrir e ao chegar msg.
// Sem filtro, sem anexo (Storage/Etapa 4).

export function FioTramitacao({
  dias,
  podePostar,
  acaoPostar,
}: {
  dias: DiaFio[];
  podePostar: boolean;
  acaoPostar: (formData: FormData) => void | Promise<void>;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const total = dias.reduce((n, d) => n + d.mensagens.length, 0);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [total]);

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-tint-2 bg-white">
      <div
        ref={scrollRef}
        className="flex flex-col gap-3.5 overflow-y-auto bg-fio-fundo p-4"
        style={{ maxHeight: "62vh", minHeight: "260px" }}
      >
        {total === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm font-medium">Nenhum andamento aqui ainda</p>
            <p className="mt-1 text-[13px] text-texto-secundario">
              Escreva o primeiro no campo abaixo — as publicações do diário
              entram sozinhas.
            </p>
          </div>
        ) : (
          dias.map((dia) => (
            <div key={dia.chave} className="flex flex-col gap-3">
              <span className="self-center rounded-full border border-tint-2 bg-white px-3 py-1 text-[11.5px] font-semibold text-texto-secundario">
                {dia.rotulo}
              </span>
              {dia.mensagens.map((m) => (
                <div
                  key={m.id}
                  className={`flex items-end gap-2.5 ${m.ehMeu ? "flex-row-reverse" : ""}`}
                >
                  <span
                    className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-[11px] font-bold text-white"
                    style={{ background: m.cor }}
                    title={m.autorNome}
                  >
                    {m.iniciais}
                  </span>
                  <div
                    className={`flex max-w-[80%] flex-col gap-1.5 rounded-2xl border px-3.5 py-2.5 ${
                      m.ehMeu
                        ? "border-fio-meu-borda bg-fio-meu"
                        : "border-tint-2 bg-white"
                    }`}
                  >
                    <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span
                        className="text-xs font-bold"
                        style={{ color: m.cor }}
                      >
                        {m.autorNome}
                      </span>
                      {m.autorPapel && (
                        <span className="text-[11px] text-texto-secundario">
                          {m.autorPapel}
                        </span>
                      )}
                      {m.processoNumero && (
                        <span className="text-[11px] tabular-nums text-texto-secundario">
                          ⚖ {m.processoNumero}
                        </span>
                      )}
                    </span>
                    <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed">
                      {m.texto}
                    </p>
                    {m.chip && (
                      <Link
                        href={m.chip.href as Route}
                        className="self-start rounded-lg border border-tint-3 bg-white px-2.5 py-1 text-xs font-semibold text-teal hover:no-underline"
                      >
                        {m.chip.texto}
                      </Link>
                    )}
                    <span className="self-end text-[10.5px] text-texto-secundario">
                      {m.hora}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {podePostar && (
        <form
          action={acaoPostar}
          className="flex items-end gap-2.5 border-t border-tint-2 bg-white p-3"
        >
          <textarea
            name="texto"
            required
            rows={2}
            placeholder="Escrever um andamento…"
            className="campo min-h-[52px] flex-1 resize-y"
          />
          <BotaoEnviar className="botao-primario h-[38px] px-4">
            Enviar
          </BotaoEnviar>
        </form>
      )}
    </div>
  );
}
