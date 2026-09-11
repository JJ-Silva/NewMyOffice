# Plano — Destaque para publicação DJEN sem processo vinculado

> Branch: `feat/inbox-djen-nao-vinculado` (a partir da `master`).
> **Migration pequena e aditiva**: só 2 variáveis novas em `globals.css`
> (nenhuma tabela/coluna — não é migration de banco).

## Origem

Achado Crítico da avaliação de UX: o badge que marca uma publicação que o
sistema **não** conseguiu casar com um processo (`"CNJ sem processo
cadastrado"`) tinha o mesmo fundo da página inteira (`--fundo`) — o caso que
mais exige atenção manual era o menos visível da tela. Decisões da sessão de
grilling: destaque visual **e** ordenar pro topo, **só na aba "Novas"**
(Q5/Q10 — histórico já resolvido não precisa de destaque). Bundle com o
achado Menor "texto 'Trie cada uma' pouco comum", mesmo arquivo.

## Problema (código)

`publicacoes/page.tsx`, função `Cartao` (linha ~199-211): o badge no canto
do card tem 3 estados, mas só 1 tem cor de verdade:

```tsx
style={{
  background: p.processoId ? "var(--tint-1)" : "var(--fundo)",
  color: p.processoId ? "var(--teal)" : "var(--texto-secundario)",
}}
```

- `p.processoId` presente → teal (bom, já funciona).
- `p.processoId` ausente **e** `p.cnj` presente → `"CNJ sem processo
  cadastrado"` — o achado do relatório.
- `p.processoId` ausente **e** `p.cnj` ausente → `"sem nº de processo"` —
  **mesmo problema, não estava no relatório original mas é o mesmo bug**:
  os dois casos de "sem processo" usam o mesmo `else`, então os dois herdam
  a mesma cor invisível.

## O que muda

### 1. `globals.css` — 2 tokens novos, espelhando o par `--atrasado-fundo`/`--atrasado-borda` que já existe para o mesmo padrão visual

```css
--aviso-fundo: #fffbeb;  /* amber-50 */
--aviso-borda: #fcd34d;  /* amber-300 */
```

(`--aviso: #d97706` já existe e é usado mais abaixo no mesmo card, em
"parece informativa (sem prazo)" — reaproveita o token, só falta o par de
fundo/borda pra virar um badge, não só texto solto.)

### 2. `publicacoes/page.tsx` — badge dos 2 casos "sem processo"

```tsx
style={
  p.processoId
    ? { background: "var(--tint-1)", color: "var(--teal)" }
    : {
        background: "var(--aviso-fundo)",
        color: "var(--aviso)",
        border: "1px solid var(--aviso-borda)",
      }
}
```

### 3. Ordenação — só na aba "Novas"

Publicações sem `processoId` sobem para o topo da lista (dentro do grupo,
mantém a ordem que já vinha do banco — mais recente primeiro). Função pura
nova em `lib/domain/publicacao.ts`:

```ts
export function ordenarParaTriagem<T extends { processoId: string | null }>(
  publicacoes: T[],
): T[] {
  return [...publicacoes].sort(
    (a, b) => Number(a.processoId !== null) - Number(b.processoId !== null),
  );
}
```

Em `publicacoes/page.tsx`, antes do `.map(...)`:

```ts
const listaOrdenada =
  aba === "nova" ? ordenarParaTriagem(publicacoes) : publicacoes;
```

### 4. Copy — "Trie cada uma" → "Avalie cada uma"

Linha ~68, subtítulo da página: troca só a palavra inicial, resto igual.

## Fora do escopo

- Não mexe na aba "Todas"/"Arquivadas"/"Viraram prazo" — ordenação e cor
  continuam como estão lá (Q10: destaque só importa enquanto não foi triada).
- Não adiciona ícone — o padrão existente (`text-aviso` em "parece
  informativa") já usa só cor, sem ícone; mantém consistência.

## Checklist

```
[ ] docs/features/inbox-djen-nao-vinculado.md commitado
[ ] globals.css: --aviso-fundo / --aviso-borda
[ ] publicacoes/page.tsx: badge dos 2 casos "sem processo" + ordenação na
    aba Novas + copy "Avalie cada uma"
[ ] lib/domain/publicacao.ts: ordenarParaTriagem + teste em publicacao.test.ts
[ ] tsc --noEmit · eslint · vitest · build verdes
[ ] testar no localhost: aba Novas com publicação sem processo — sobe pro
    topo, badge âmbar; aba Todas — sem mudança de ordem
[ ] /code-review
[ ] PR → Preview → merge
```
