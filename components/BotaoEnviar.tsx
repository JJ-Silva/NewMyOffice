"use client";

import { useFormStatus } from "react-dom";

// Botão de submit que se desabilita enquanto a Server Action roda — evita o
// clique duplo (que já criou pastas em duplicata). Usar sempre dentro de um
// <form action={...}> que grava dados.

export function BotaoEnviar({
  children,
  className = "botao-primario",
  rotuloOcupado = "Salvando…",
  disabled = false,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  rotuloOcupado?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={className}
      disabled={pending || disabled}
      aria-busy={pending}
      style={style}
    >
      {pending ? rotuloOcupado : children}
    </button>
  );
}
