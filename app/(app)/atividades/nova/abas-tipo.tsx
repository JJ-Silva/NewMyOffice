import Link from "next/link";
import type { Route } from "next";

// Abas Prazo / Compromisso / Monitoramento no topo do formulário (protótipo
// tela 8). São a mesma rota com ?aba=... — troca sem JS.

const ABAS = [
  { valor: "prazo", label: "Prazo" },
  { valor: "compromisso", label: "Compromisso" },
  { valor: "monitoramento", label: "Monitoramento" },
] as const;

export type AbaTipo = (typeof ABAS)[number]["valor"];

export function AbasTipo({
  aba,
  pastaId,
}: {
  aba: AbaTipo;
  pastaId: string;
}) {
  return (
    <div className="abas">
      {ABAS.map((a) => {
        const href = (`/atividades/nova?aba=${a.valor}` +
          (pastaId ? `&pasta=${pastaId}` : "")) as Route;
        return (
          <Link
            key={a.valor}
            href={href}
            className="aba"
            data-ativa={aba === a.valor}
          >
            {a.label}
          </Link>
        );
      })}
    </div>
  );
}
