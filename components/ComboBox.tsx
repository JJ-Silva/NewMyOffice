"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { filtrarOpcoes, type OpcaoComboBox } from "@/lib/combobox-filtro";

export type { OpcaoComboBox };

// Combobox inline: um <input> de texto que filtra a lista embaixo. Só aceita um
// item da lista — texto digitado que não vira escolha é descartado no blur.
// Filtro client-side, acento-insensível. Para listas grandes com busca no
// servidor (processo), use BuscaSeletor.
//
// Dois modos:
//  - não-controlado: passa `valorInicial`; o valor viaja num <input hidden name>
//  - controlado: passa `value` + `onChange` (forms client que já têm estado)

type Base = {
  name: string;
  opcoes: OpcaoComboBox[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string; // vai no wrapper (ex.: largura fixa)
};

type Props =
  | (Base & { valorInicial?: string; value?: undefined; onChange?: undefined })
  | (Base & { value: string; onChange: (value: string) => void; valorInicial?: undefined });

export function ComboBox(props: Props) {
  const {
    name,
    opcoes,
    placeholder = "Digite para filtrar…",
    required = false,
    disabled = false,
    className = "",
  } = props;

  const controlado = props.value !== undefined;

  const rotuloDe = useMemo(() => {
    const m = new Map(opcoes.map((o) => [o.value, o.label] as const));
    return (v: string) => (v ? (m.get(v) ?? "") : "");
  }, [opcoes]);

  const [valorInterno, setValorInterno] = useState(props.valorInicial ?? "");
  const valor = controlado ? (props.value as string) : valorInterno;

  // `rascunho` só vale enquanto o campo está em foco; fora do foco, o que
  // aparece é sempre o rótulo do valor (derivado — sem useEffect de sync).
  const [rascunho, setRascunho] = useState("");
  const [aberto, setAberto] = useState(false);
  const [foco, setFoco] = useState(false);
  const [realce, setRealce] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);
  const listaId = useId();

  // Mantém a opção em realce visível enquanto navega pelas setas.
  useEffect(() => {
    if (!aberto) return;
    const alvo = listaRef.current?.querySelector<HTMLElement>(
      `[data-indice="${realce}"]`,
    );
    alvo?.scrollIntoView({ block: "nearest" });
  }, [realce, aberto]);

  const rotuloAtual = rotuloDe(valor);
  const exibido = foco ? rascunho : rotuloAtual;

  const filtrando = foco && rascunho.trim() !== "" && rascunho !== rotuloAtual;
  const filtradas = filtrando ? filtrarOpcoes(opcoes, rascunho) : opcoes;

  function commitar(v: string) {
    if (controlado) props.onChange(v);
    else setValorInterno(v);
  }

  function escolher(o: OpcaoComboBox) {
    commitar(o.value);
    setFoco(false);
    setAberto(false);
    inputRef.current?.blur();
  }

  function aoSair() {
    setFoco(false);
    setAberto(false);
  }

  function aoTeclar(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAberto(true);
      setRealce((i) => Math.min(i + 1, filtradas.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setRealce((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && aberto) {
      e.preventDefault();
      const o = filtradas[realce];
      if (o) escolher(o);
    } else if (e.key === "Escape") {
      aoSair();
    }
  }

  return (
    <div className={`relative ${className}`}>
      {/* o valor sempre viaja num hidden — inclusive no modo controlado, pra
          quem lê o FormData (Server Action) */}
      <input type="hidden" name={name} value={valor} />

      {required && (
        <input
          type="text"
          value={valor}
          required
          onChange={() => {}}
          onFocus={() => inputRef.current?.focus()}
          tabIndex={-1}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
        />
      )}

      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={aberto}
        aria-controls={listaId}
        aria-autocomplete="list"
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
        placeholder={placeholder}
        value={exibido}
        className="campo w-full"
        onChange={(e) => {
          setRascunho(e.target.value);
          setAberto(true);
          setRealce(0);
        }}
        onFocus={() => {
          setFoco(true);
          setRascunho(rotuloAtual);
          setAberto(true);
          setRealce(0);
          inputRef.current?.select();
        }}
        onBlur={aoSair}
        onKeyDown={aoTeclar}
      />

      {aberto && !disabled && (
        <ul
          ref={listaRef}
          id={listaId}
          role="listbox"
          className="absolute left-0 right-0 z-30 mt-1 max-h-64 overflow-auto rounded-lg border border-tint-2 bg-white py-1 shadow-lg"
        >
          {filtradas.length === 0 ? (
            <li className="px-3 py-2 text-[13px] text-texto-secundario">
              Nada encontrado.
            </li>
          ) : (
            filtradas.map((o, i) => (
              <li key={o.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={o.value === valor}
                  data-indice={i}
                  data-realce={i === realce || undefined}
                  onMouseEnter={() => setRealce(i)}
                  onMouseDown={(e) => {
                    e.preventDefault(); // dispara antes do blur do input
                    escolher(o);
                  }}
                  className="busca-linha"
                >
                  <span className="block truncate text-[13.5px] text-texto">
                    {o.label}
                  </span>
                  {o.sub && (
                    <span className="block truncate text-xs text-texto-secundario">
                      {o.sub}
                    </span>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

