"use client";

import { useState } from "react";

// Botão que copia uma URL para a área de transferência.
export function CopiarLink({ url }: { url: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // navegador sem clipboard API — seleciona no prompt como fallback
      window.prompt("Copie o link do convite:", url);
    }
  }

  return (
    <button
      type="button"
      onClick={copiar}
      className="botao-secundario h-[30px] text-xs"
      title={url}
    >
      {copiado ? "copiado ✓" : "copiar link"}
    </button>
  );
}
