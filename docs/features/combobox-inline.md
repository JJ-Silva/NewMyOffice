# Plano — ComboBox inline (campos de lista média/grande)

> Branch: `feat/combobox-inline` (a partir da `master`).
> **Sem migration.** Só troca de UI.

## Context

Vários `<select>` nativos têm listas de 15–100+ itens (tribunal, tipo de
atividade, área). Rolar até o item é ruim. O `BuscaSeletor` (modal, busca no
servidor) resolve isso para **processo** — lista enorme, mostra pasta·cliente
por linha. Para as listas fixas e menores, um **combobox inline** é mais leve:
digita no próprio campo, a lista cai embaixo filtrada, escolhe.

**O modal (`BuscaSeletor`) fica como está.** Não some, não muda.

## Componente — `components/ComboBox.tsx` (client)

- `<input type="text">` visível (digita = filtra) + `<input type="hidden" name>`
  com o `value` escolhido (é isso que o form envia).
- Filtro **client-side**, acento-insensível, sobre o `label`.
- ↑↓ navega, Enter / clique (mouseDown) escolhe, Esc fecha, blur descarta o
  texto não confirmado (volta pra seleção anterior).
- **Só um item da lista é aceito** — nunca texto livre.
- `required` via input invisível sobreposto (mesmo truque do `BuscaSeletor`).
- Dois modos: **não-controlado** (`valorInicial` + envia no form) e
  **controlado** (`value` + `onChange`, pros forms client que já têm estado).
- Respeita `<fieldset disabled>` (o input desabilita nativamente).

## Campos convertidos (régua: lista fixa de ~10+ itens)

| Campo | Arquivo | Modo |
|---|---|---|
| Tribunal (feriados) | `atividades/nova/formulario-prazo.tsx` | não-controlado (form GET) |
| Tipo de prazo | `atividades/nova/formulario-prazo.tsx` | não-controlado |
| Tipo de compromisso | `atividades/nova/formulario-compromisso.tsx` | não-controlado |
| Tipo de monitoramento | `atividades/nova/formulario-monitoramento.tsx` | não-controlado |
| Área | `pastas/nova/page.tsx` · `pastas/[id]/page.tsx` | não-controlado |
| Tribunal | `processos/novo/formulario-judicial.tsx` · `processos/[id]/formularios-edicao.tsx` | **controlado** (o número CNJ pré-seleciona) |
| Processo judicial (vincular publicação) | `publicacoes/[id]/page.tsx` | não-controlado |
| Pasta (filtro) | `processos/page.tsx` · `agenda/page.tsx` · `agenda/calendario/page.tsx` | não-controlado (form GET) |
| Pasta | `processos/novo/formulario-administrativo.tsx` · `processos/[id]/formularios-edicao.tsx` (BlocoPasta) | não-controlado |
| Pasta | `processos/novo/formulario-judicial.tsx` | controlado |
| Cliente | `pastas/nova/page.tsx` · `pastas/[id]/page.tsx` (vincular) | não-controlado |

**Fora**: `<select>` de 2–5 opções (status, polo, esfera, tipo de pessoa,
evento, tipo/status dos filtros da agenda) — não vale.

## Checklist

```
[ ] docs/features/combobox-inline.md commitado
[ ] components/ComboBox.tsx + teste (lib se houver lógica pura extraída)
[ ] converter os campos da tabela
[ ] tsc --noEmit · eslint · vitest · build verdes
[ ] testar no localhost: digitar filtra, escolher grava, blur com texto
    inválido volta, required barra vazio, form GET do prazo faz round-trip
[ ] /code-review
[ ] PR → Preview → merge
```
