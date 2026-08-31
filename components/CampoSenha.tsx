"use client";

import { useState } from "react";

// Campo de senha com botão "espiar" (alterna entre •••• e texto).
export function CampoSenha({
  name,
  label,
  placeholder = "••••••••",
  autoComplete = "new-password",
  minLength,
  required = true,
}: {
  name: string;
  label: string;
  placeholder?: string;
  autoComplete?: string;
  minLength?: number;
  required?: boolean;
}) {
  const [ver, setVer] = useState(false);

  return (
    <label className="flex flex-col gap-1.5">
      <span className="rotulo">{label}</span>
      <div className="relative">
        <input
          type={ver ? "text" : "password"}
          name={name}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="campo h-10 w-full pr-[68px]"
        />
        <button
          type="button"
          onClick={() => setVer((v) => !v)}
          tabIndex={-1}
          aria-label={ver ? "Ocultar senha" : "Mostrar senha"}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-1.5 py-1 text-xs font-medium text-texto-secundario hover:text-texto"
        >
          {ver ? "ocultar" : "espiar"}
        </button>
      </div>
    </label>
  );
}
