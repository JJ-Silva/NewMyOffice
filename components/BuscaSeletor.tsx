"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

// Seletor por busca: o campo é um botão; clicar abre um modal onde se digita
// (o servidor filtra) e escolhe uma linha. A escolha vai num <input hidden> —
// funciona igual dentro de <form method="get"> e de <form action={serverAction}>.
//
// Genérico: não sabe o que está selecionando. Recebe o `endpoint` (que devolve
// { itens: { id, primario, secundario }[], temMais, truncado }) e os textos.

type Item = { id: string; primario: string; secundario: string };

type Resposta = {
  itens: Item[];
  temMais: boolean;
  truncado: boolean;
};

const DEBOUNCE_MS = 250;

export function BuscaSeletor({
  name,
  endpoint,
  valorInicial = "",
  rotuloInicial = null,
  textoVazio,
  tituloModal,
  placeholder,
  required = false,
  aoEscolher,
}: {
  name: string;
  endpoint: string;
  valorInicial?: string;
  rotuloInicial?: string | null;
  textoVazio: string;
  tituloModal: string;
  placeholder: string;
  required?: boolean;
  // quando presente, é chamado além de atualizar o campo escondido — usado pela
  // Tramitação pra navegar assim que se escolhe um processo (sem botão "enviar")
  aoEscolher?: (id: string, rotulo: string) => void;
}) {
  const [escolha, setEscolha] = useState<{ id: string; rotulo: string } | null>(
    valorInicial && rotuloInicial
      ? { id: valorInicial, rotulo: rotuloInicial }
      : null,
  );
  const [aberto, setAberto] = useState(false);

  const tituloId = useId();
  const dispararRef = useRef<HTMLButtonElement>(null);

  function fechar() {
    setAberto(false);
    dispararRef.current?.focus();
  }

  function escolher(item: Item) {
    setEscolha({ id: item.id, rotulo: item.primario });
    setAberto(false);
    dispararRef.current?.focus();
    aoEscolher?.(item.id, item.primario);
  }

  return (
    <div className="relative">
      {/* valor pro form (GET ou Server Action). Fica por cima do botão,
          invisível e sem capturar clique — assim, quando está vazio e o form é
          enviado, o balão de validação nativo (`required`) aponta pro campo
          visível, não pra um elemento fora da tela. */}
      <input
        type="text"
        name={name}
        value={escolha?.id ?? ""}
        required={required}
        onChange={() => {}}
        onFocus={() => dispararRef.current?.focus()}
        tabIndex={-1}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
      />

      <button
        type="button"
        ref={dispararRef}
        onClick={() => setAberto(true)}
        className="campo flex w-full items-center justify-between gap-2 text-left"
        aria-haspopup="dialog"
      >
        <span className={`truncate ${escolha ? "" : "text-placeholder"}`}>
          {escolha?.rotulo ?? textoVazio}
        </span>
        <span aria-hidden className="flex-none text-xs text-texto-secundario">
          buscar
        </span>
      </button>

      {aberto && (
        <ModalBusca
          endpoint={endpoint}
          tituloModal={tituloModal}
          tituloId={tituloId}
          placeholder={placeholder}
          aoFechar={fechar}
          aoEscolher={escolher}
        />
      )}
    </div>
  );
}

function ModalBusca({
  endpoint,
  tituloModal,
  tituloId,
  placeholder,
  aoFechar,
  aoEscolher,
}: {
  endpoint: string;
  tituloModal: string;
  tituloId: string;
  placeholder: string;
  aoFechar: () => void;
  aoEscolher: (item: Item) => void;
}) {
  const [q, setQ] = useState("");
  const [itens, setItens] = useState<Item[]>([]);
  const [temMais, setTemMais] = useState(false);
  const [truncado, setTruncado] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [realce, setRealce] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const fecharRef = useRef<HTMLButtonElement>(null);
  const listaRef = useRef<HTMLDivElement>(null);
  const sentinelaRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const buscar = useCallback(
    async (texto: string, anexar: boolean) => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      const offset = anexar ? offsetRef.current : 0;

      const meu = ctrl; // esta requisição; se outra começar, `meu` fica velho
      const souAtual = () => abortRef.current === meu;

      setCarregando(true);
      setErro(null);
      try {
        const url =
          `${endpoint}?q=${encodeURIComponent(texto)}` +
          `&offset=${offset}`;
        const resp = await fetch(url, { signal: meu.signal });
        if (!souAtual()) return; // uma busca mais nova assumiu
        if (!resp.ok) throw new Error(String(resp.status));
        const dados = (await resp.json()) as Resposta;
        if (!souAtual()) return;

        offsetRef.current = offset + dados.itens.length;
        setItens((atuais) => {
          if (!anexar) return dados.itens;
          const vistos = new Set(atuais.map((i) => i.id));
          return [...atuais, ...dados.itens.filter((i) => !vistos.has(i.id))];
        });
        setTemMais(dados.temMais);
        setTruncado(dados.truncado);
        if (!anexar) setRealce(0);
      } catch (e) {
        if (!souAtual()) return;
        if (e instanceof DOMException && e.name === "AbortError") return;
        setErro("Não deu para buscar agora. Tente de novo.");
      } finally {
        // só a requisição vigente mexe no estado de carregando
        if (souAtual()) setCarregando(false);
      }
    },
    [endpoint],
  );

  // Foca o input ao abrir.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // 1ª página ao abrir (sem espera) + debounce a cada tecla.
  const primeiraRef = useRef(true);
  useEffect(() => {
    const espera = primeiraRef.current ? 0 : DEBOUNCE_MS;
    primeiraRef.current = false;
    const t = setTimeout(() => void buscar(q, false), espera);
    return () => clearTimeout(t);
  }, [q, buscar]);

  // Scroll infinito: observa a sentinela dentro da própria lista (root).
  useEffect(() => {
    const alvo = sentinelaRef.current;
    const raiz = listaRef.current;
    if (!alvo || !raiz || !temMais || carregando) return;
    const obs = new IntersectionObserver(
      (entradas) => {
        if (entradas[0]?.isIntersecting) void buscar(q, true);
      },
      { root: raiz, rootMargin: "120px" },
    );
    obs.observe(alvo);
    return () => obs.disconnect();
  }, [temMais, carregando, q, buscar]);

  function aoTeclar(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      aoFechar();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setRealce((i) => Math.min(i + 1, itens.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setRealce((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = itens[realce];
      if (item) aoEscolher(item);
    } else if (e.key === "Tab") {
      // trava o foco no modal: alterna entre input e o botão fechar
      e.preventDefault();
      (document.activeElement === inputRef.current
        ? fecharRef.current
        : inputRef.current
      )?.focus();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[10vh]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) aoFechar();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        onKeyDown={aoTeclar}
        className="card flex max-h-[80vh] w-full max-w-[720px] flex-col gap-3 p-4"
      >
        <div className="flex items-center justify-between gap-2">
          <span id={tituloId} className="text-sm font-semibold">
            {tituloModal}
          </span>
          <button
            type="button"
            ref={fecharRef}
            onClick={aoFechar}
            className="rounded px-1.5 py-1 text-xs font-medium text-texto-secundario hover:text-texto"
          >
            fechar
          </button>
        </div>

        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="campo w-full"
          type="text"
          autoComplete="off"
          spellCheck={false}
        />

        {truncado && (
          <p className="text-xs text-aviso">
            Muitos resultados — refine a busca para ver todos.
          </p>
        )}
        {erro && <p className="text-xs text-atrasado">{erro}</p>}

        <div ref={listaRef} className="-mx-1 flex-1 overflow-y-auto">
          {itens.length === 0 && !carregando && !erro ? (
            <p className="px-1 py-6 text-center text-sm text-texto-secundario">
              Nada encontrado.
            </p>
          ) : (
            <ul className="flex flex-col">
              {itens.map((item, i) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => aoEscolher(item)}
                    onMouseEnter={() => setRealce(i)}
                    data-realce={i === realce ? "" : undefined}
                    className="busca-linha"
                  >
                    <span className="block truncate text-[13.5px] font-medium text-texto">
                      {item.primario}
                    </span>
                    {item.secundario && (
                      <span className="block truncate text-xs text-texto-secundario">
                        {item.secundario}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div ref={sentinelaRef} />
          {carregando && (
            <p className="px-1 py-3 text-center text-xs text-texto-secundario">
              buscando…
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
