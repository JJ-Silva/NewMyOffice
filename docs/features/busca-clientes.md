# Plano — Busca na lista de clientes

> Entregue junto da branch `feat/combobox-inline` (mesma leva de usabilidade
> das listas). **Sem migration.**

## Context

`/clientes` listava tudo sem filtro. Com dezenas de clientes já é ruim achar
um. As telas `/processos` e `/agenda` já têm o padrão "form GET + filtro".

## Fatia

- `lib/domain/busca-cliente.ts` — `clienteCasaBusca` / `filtrarClientes`,
  puros e testados. Casa por **nome**, **e-mail** (acento-insensível, em
  qualquer parte) ou pelos **dígitos do CPF/CNPJ** (a partir de 2 dígitos).
- `lib/texto.ts` — `normalizarTexto` (sem acento, minúsculo, trim). Extraído
  de `lib/combobox-filtro.ts`, que passou a importá-lo.
- `app/(app)/clientes/page.tsx` — lê `?q=`, carrega todos e filtra em memória
  (a lista é pequena, mesma abordagem do filtro de `listarProcessos`). Form
  GET com `<input type="search">`, botão "Buscar", link "Limpar". Subtítulo
  vira "N de M clientes" enquanto filtra. Empty-state separado para "nenhum
  cadastrado" vs "nenhum para «termo»".

## Checklist

```
[x] lib/domain/busca-cliente.ts + teste (9 casos)
[x] lib/texto.ts + combobox-filtro passa a usar
[x] clientes/page.tsx — form GET, subtítulo, empty-states
[x] tsc · eslint · vitest · build verdes
[x] testado no localhost: nome, e-mail, CPF com pontuação, sem match, limpar
[ ] /code-review
[ ] merge junto da feat/combobox-inline
```
