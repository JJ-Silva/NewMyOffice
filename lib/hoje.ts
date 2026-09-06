// "Hoje" no fuso do Brasil, como 'AAAA-MM-DD'. Fica fora de lib/domain
// (que é puro/determinístico) — aqui há dependência do relógio.

export function hojeNoBrasil(): string {
  // en-CA formata como 'AAAA-MM-DD'
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });
}

// Um instante do banco (timestamptz, ex.: '2026-09-06T23:30:00Z') formatado no
// fuso do Brasil: 'DD/MM/AAAA HH:MM'. Não usar formatarDataBR aqui — ela ignora
// o fuso e um andamento das 21h30 BRT apareceria no dia seguinte.
export function formatarDataHoraBrasil(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const data = d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const hora = d.toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${data} ${hora}`;
}
