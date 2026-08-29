// "Hoje" no fuso do Brasil, como 'AAAA-MM-DD'. Fica fora de lib/domain
// (que é puro/determinístico) — aqui há dependência do relógio.

export function hojeNoBrasil(): string {
  // en-CA formata como 'AAAA-MM-DD'
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });
}
