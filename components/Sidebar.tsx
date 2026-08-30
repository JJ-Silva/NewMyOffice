"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { sair } from "@/app/(app)/acoes";

type ItemNav = { href: Route; label: string };

export function Sidebar({
  usuarioNome,
  escritorioNome,
  mostrarConfiguracoes,
}: {
  usuarioNome: string;
  escritorioNome: string;
  mostrarConfiguracoes: boolean;
}) {
  const caminho = usePathname();

  // Só as rotas que já existem na Etapa 1. "Nova atividade" (Passo 7) e a
  // agenda de verdade (Passo 8) entram depois.
  const itens: ItemNav[] = [
    { href: "/agenda", label: "Agenda de atividades" },
    { href: "/atividades/nova", label: "Nova atividade" },
    { href: "/clientes", label: "Clientes" },
    { href: "/pastas", label: "Pastas" },
  ];
  if (mostrarConfiguracoes) {
    itens.push({ href: "/configuracoes", label: "Configurações" });
  }

  return (
    <aside className="sidebar">
      <div className="flex items-center gap-2.5 px-2">
        <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-lg bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.ico" alt="" className="h-[21px] w-[21px] object-contain" />
        </span>
        <span className="text-[15px] font-semibold tracking-tight text-white">
          MyOffice
        </span>
      </div>

      <nav className="flex flex-col gap-0.5">
        <span className="px-2 pb-2 text-[11px] font-medium uppercase tracking-[0.06em] text-white/40">
          Trabalho
        </span>
        {itens.map((item) => {
          const ativo =
            caminho === item.href || caminho.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className="nav-item"
              data-ativo={ativo}
            >
              <span className="h-4 w-4 flex-none rounded border-[1.5px] border-current opacity-75" />
              <span className="flex-1">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-3 border-t border-white/10 pt-[18px]">
        <div className="flex items-center gap-2.5">
          <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full bg-white/15 text-xs font-semibold text-white">
            {iniciais(usuarioNome)}
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[13px] font-medium text-white">
              {usuarioNome}
            </span>
            <span className="text-[11px] text-white/50">{escritorioNome}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href="/trocar-escritorio"
            className="flex-1 rounded-lg border border-white/15 px-2 py-2 text-center text-xs font-medium text-white/60 hover:border-white/40 hover:text-white"
          >
            Trocar
          </Link>
          <form action={sair} className="flex-1">
            <button
              type="submit"
              className="w-full rounded-lg border border-white/15 px-2 py-2 text-xs font-medium text-white/60 hover:border-white/40 hover:text-white"
            >
              Sair
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}
