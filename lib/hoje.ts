// "Hoje" no fuso do Brasil, como 'AAAA-MM-DD'. Fica fora de lib/domain
// (que é puro/determinístico) — aqui há dependência do relógio.

export function hojeNoBrasil(): string {
  // en-CA formata como 'AAAA-MM-DD'
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });
}

// Um instante do banco (timestamptz, ex.: '2026-09-06T23:30:00Z') no fuso do
// Brasil, separado em `data` ('AAAA-MM-DD') e `hora` ('HH:MM'). A Tramitação
// agrupa o fio por dia e mostra a hora — não dá pra usar formatarDataBR
// (ignora o fuso: um andamento das 21h30 BRT cairia no dia seguinte).
export function instanteNoBrasil(iso: string): { data: string; hora: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { data: iso.slice(0, 10), hora: "" };
  return {
    data: d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }),
    hora: d.toLocaleTimeString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}
