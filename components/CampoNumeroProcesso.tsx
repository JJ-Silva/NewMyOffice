"use client";

import { useRef } from "react";

// Campo do número do processo. Ao SAIR do campo (blur), se o valor mudou,
// re-submete o form GET — o servidor identifica o tribunal e, se for um CNJ,
// já consulta o DataJud.
export function CampoNumeroProcesso({
  defaultValue,
}: {
  defaultValue: string;
}) {
  const ultimoEnviado = useRef(defaultValue);

  function reconhecer(el: HTMLInputElement) {
    const v = el.value.trim();
    if (v && v !== ultimoEnviado.current) {
      ultimoEnviado.current = v;
      el.form?.requestSubmit();
    }
  }

  return (
    <input
      name="numero"
      required
      defaultValue={defaultValue}
      placeholder="CNJ, REsp, RE, AREsp, número antigo…"
      className="campo tabular-nums"
      onBlur={(e) => reconhecer(e.currentTarget)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          reconhecer(e.currentTarget);
        }
      }}
    />
  );
}
