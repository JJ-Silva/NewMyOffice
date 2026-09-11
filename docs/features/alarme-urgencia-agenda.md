# Plano — Alarme de urgência na Agenda

> Branch: `feat/alarme-urgencia-agenda` (a partir da `master`).
> **Sem migration.** Só cor/estilo — reaproveita `EstadoAgenda` e a paleta que já
> existe em `globals.css` (`--atrasado`, `--hora-de-fazer`) e em `COR_ESTADO`
> (hoje local a `agenda/page.tsx`).

## Origem

Achado da avaliação de UX (achados Crítico "Situação sem cor de alarme" e Menor
"texto de urgência com baixo destaque" + "botão Concluir idêntico"). Ver
[[Situação (estado da agenda)]] em `CONTEXT.md` — vocabulário já resolvido lá.

## Problema

- Na lista (`agenda/page.tsx`), a data (`r.cor`, linha ~320) já é colorida por
  estado. O texto abaixo dela (`r.sub`, ex. "atrasado há 14 dias" — linha ~327)
  não é: só `text-[11.5px] text-texto-secundario`, cor neutra.
- No detalhe (`agenda/[id]/page.tsx`), o badge "Situação" (`ESTADO_LABEL`,
  linha ~180) não tem cor nenhuma — mesmo quando o estado é `atrasada`.
- O botão "✓ Concluir" (linha ~348, `agenda/page.tsx`) é `.botao-concluir`
  fixo, igual em toda linha, sem relação com o estado.

## O que muda

### 1. Extrair `COR_ESTADO` para `lib/domain/atividade.ts`

Hoje `COR_ESTADO: Record<EstadoAgenda, string>` é uma const local em
`agenda/page.tsx` (linhas 28–35). Vira export em `lib/domain/atividade.ts`,
ao lado do tipo `EstadoAgenda` — continua TypeScript puro (são só hex
strings, sem React/Supabase). `agenda/page.tsx` e `agenda/[id]/page.tsx`
importam do mesmo lugar em vez de duplicar.

```ts
// lib/domain/atividade.ts
export const COR_ESTADO: Record<EstadoAgenda, string> = {
  atrasada: "#DC2626",
  vence_hoje: "#F5C400",
  hora_de_fazer: "#D97706",
  futura: "#B9D4D3",
  concluida: "#16A34A",
  cancelada: "#9AA0A6",
};
```

### 2. Lista (`agenda/page.tsx`) — colorir o texto `r.sub`

Linha ~327, aplicar a mesma regra de cor já usada na data (linha ~322):

```tsx
<span
  className="text-[11.5px] font-semibold"
  style={{ color: r.cor === "#B9D4D3" ? "var(--texto-secundario)" : r.cor }}
>
  {r.sub}
  ...
</span>
```

`futura` continua neutro (não é estado de alarme); os outros 5 ganham a cor
do estado + negrito.

### 3. Detalhe (`agenda/[id]/page.tsx`) — colorir o badge "Situação"

Linha ~180, mesma regra:

```tsx
<span
  className="text-base font-semibold"
  style={{ color: estado === "futura" ? undefined : COR_ESTADO[estado] }}
>
  {ESTADO_LABEL[estado] ?? estado}
</span>
```

### 4. Botão "✓ Concluir" — diferenciar nos 2 estados mais urgentes

Linha ~348, `agenda/page.tsx`. Só quando `r.estado` é `atrasada` ou
`vence_hoje`, a borda do botão usa `r.cor` em vez do verde padrão de
`.botao-concluir` (o texto/ícone continuam os mesmos — é só a borda que
muda, para não competir com o verde de "ação positiva a fazer"):

```tsx
<BotaoEnviar
  className="botao-concluir"
  style={
    r.estado === "atrasada" || r.estado === "vence_hoje"
      ? { borderColor: r.cor }
      : undefined
  }
  rotuloOcupado="…"
>
  ✓ Concluir
</BotaoEnviar>
```

(`BotaoEnviar` já aceita `style` — ver `components/BotaoEnviar.tsx`.)

## Fora do escopo

- Estado `hora_de_fazer` já tem cor própria (`#D97706`) e passa a valer nos 3
  pontos acima também — não é uma decisão nova, só consequência de usar
  `COR_ESTADO` de forma consistente.
- Não mexe em `--amarelo`/`--amarelo-hover` (botão primário) nem cria token
  novo em `globals.css` — a paleta usada já existe como consts TS.
- Legenda de status (`?`) mencionada em `TELAS.md` linha 48 — não faz parte
  deste achado, fica para quando alguém sentir falta.

## Checklist

```
[ ] docs/features/alarme-urgencia-agenda.md commitado
[ ] COR_ESTADO extraído para lib/domain/atividade.ts, importado nos 2 lugares
[ ] agenda/page.tsx: r.sub colorido + botão Concluir com borda por estado
[ ] agenda/[id]/page.tsx: badge Situação colorido
[ ] tsc --noEmit · eslint · vitest · build verdes
[ ] testar no localhost: um prazo atrasado, um vence hoje, um futuro — 3 estados
    visíveis na lista e no detalhe, cor de cada um bate com COR_ESTADO
[ ] /code-review
[ ] PR → Preview → merge
```
