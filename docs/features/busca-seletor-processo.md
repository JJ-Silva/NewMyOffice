# Plano — modal de busca para seleção de processo (fatia fina)

> Branch: `feat/busca-seletor-processo` (a partir da `master` atualizada).
> **Sem migration.**

---

## Context — por que mexer nisso

Hoje **toda** escolha de processo / cliente / pasta no MyOffice é um `<select>`
nativo, montado à mão em cada tela (6+ lugares), sem busca, com rótulos
inconsistentes:

| Onde | Escolhe | Como | Rótulo |
|---|---|---|---|
| `atividades/nova` (3 abas) | processo | `components/SelecaoProcesso` (`<select>`+`<optgroup>`) | `nº · tipo` |
| `publicacoes/[id]` | processo judicial | `<select>` inline (formato próprio) | `nº · pasta · cliente` |
| `pastas/nova`, `pastas/[id]` | cliente | `<select>` inline | `nome — CPF/CNPJ` |
| `processos/novo`, filtros de `agenda`/`processos` | pasta | `<select>` inline | `nome ?? código` |

O Jefferson já migrou casos reais; o volume alvo é **milhares** de processos. Um
`<select>` não escala e não deixa buscar. Na planilha VBA antiga havia um
**"Painel de Pesquisa"**: modal com grade de resultados, o usuário digitava
(nome do cliente, nº da pasta, nº do processo…) e selecionava uma linha.

**Objetivo desta fatia:** portar esse modelo para uma peça reutilizável e provar
no caso mais difícil — a seleção de **processo** em `atividades/nova`.

### Decisões travadas (grilling — 3 rounds)

- **Modelo:** modal de busca. Campo vira um botão; clicar abre o modal; digita →
  resultados do servidor → escolhe → modal fecha, botão mostra a escolha,
  `<input hidden>` carrega o id.
- **Busca no servidor** (volume = milhares), com debounce. Não "carrega tudo".
- **Uma caixa de busca cross-field.** O texto casa contra: **número** (CNJ com/sem
  pontuação + formatos livres), **pasta** (código `AAAA/NNNNNN` + nome),
  **cliente** (nome), **partes/adverso** (nome na tabela `parte`).
- **Componente próprio**, sem dependência nova (regra do CLAUDE.md).
- **Implementação: várias queries explícitas em `lib/db`, unidas no TS.** Sem
  RPC, sem query builder dinâmico, sem migration.
- **O processo `geral` aparece** nos resultados (achável por pasta/cliente) —
  atividade de nível-pasta precisa apontar pra ele —, mas **sem o jargão "geral
  da pasta"**: a linha se apresenta como a **própria pasta**.
  - primário = `pasta.nome` (ou `pasta.codigo` se sem nome)
  - secundário = `pasta.codigo · cliente`
  - judicial/administrativo continuam com primário = número, secundário =
    `pasta · cliente · tipo`.
- **Estado inicial do modal:** lista tudo, paginado, **scroll infinito**.
- **`SelecaoProcesso` é removido** depois que as 3 abas trocam. A formatação pura
  vai para `lib/domain/` e é reaproveitada.
- **Foco: busca + consistência.** Encadeamento cliente→pasta→processo NÃO entra
  agora.

### RLS (reler antes de concluir que é seguro — CLAUDE.md)

`processo`, `processo_judicial`, `processo_administrativo`, `parte` →
`escritorio_id` + `tem_permissao('processos.ver')` + `deletado_em is null`
(migration `20260831140000`). `pasta`/`pasta_cliente` → `pastas.ver`;
`cliente` → `clientes.ver`.

A busca roda com o **client de sessão** (`criarClienteServidor()`), então herda
esses gates — **mesma visibilidade de hoje**, nada é alargado. Quem não tem
`clientes.ver` simplesmente não acha por nome de cliente (degradação silenciosa,
igual ao `SelecaoProcesso` atual, que já junta `pasta`/`pasta_cliente`).
Nenhuma policy nova; nenhuma tabela nova.

---

## A fatia vertical fina

### 1. `lib/domain/rotulo-processo.ts` (novo — mover + testar)

Recorta a formatação de `components/SelecaoProcesso.tsx` para um módulo puro (TS
puro, sem React/Supabase). Exporta uma função que devolve **as duas linhas** do
resultado a partir de um `ProcessoParaSelecao`:

```
linhasDoProcesso(p) → { primario: string; secundario: string }
```

- `tipo === "geral"` → `primario = p.pastaNome ?? p.pastaCodigo`,
  `secundario = [p.pastaCodigo, p.clienteNome].filter(Boolean).join(" · ")`
  (nunca aparece a palavra "geral").
- judicial/administrativo → `primario = p.numero ?? "sem número"`,
  `secundario = [pasta, cliente, tipo].filter(Boolean).join(" · ")`.

Teste `*.test.ts` cobrindo geral (com e sem nome de pasta) / judicial /
administrativo / sem número / sem pasta.

### 2. `lib/db/processos.ts` (novo — funções de busca)

Remove `listarProcessosParaSelecao` (único consumidor era `atividades/nova`).
Acrescenta, reusando o type `ProcessoParaSelecao` que já existe:

- **`buscarProcessosParaSelecao(supabase, escritorioId, { q, offset, limite })`**
  `→ { itens: ProcessoParaSelecao[]; temMais: boolean }`
  - `q` vazio → **uma** query: `processo` (todos os tipos, inclui `geral`)
    `order by ano desc, sequencial desc` + `range(offset, offset+limite)`.
  - `q` preenchido → **queries de id explícitas, uma por campo** (cada uma
    `select id` + `limit` alto p.ex. 400):
    1. `processo` por `numero ilike %q%` **e** por `numero ilike %<q só dígitos>%`
    2. `pasta` por `codigo ilike` / `nome ilike` → `processo.pasta_id in (…)`
    3. `cliente` por `nome ilike` → `pasta_cliente` → `processo.pasta_id in (…)`
    4. `parte` por `nome ilike` (ou `advogado_adverso ilike`) → `processo_id in (…)`
    - une os ids no TS (`Set`), dedup, então **uma** query final
      `processo … where id in (ids) order by … range(offset, offset+limite)`.
    - `temMais` = ids restantes além da página. Se algum passo bater no teto de
      400, o modal mostra um aviso "refine a busca" (comentário no código).
  - Hidrata pasta/código/nome/cliente como o `listarProcessosParaSelecao` fazia
    (mesmo `select` aninhado, mesmos helpers `um`/`arr`).
- **`buscarProcessoParaSelecao(supabase, escritorioId, id)` `→ ProcessoParaSelecao | null`**
  Uma linha, para o rótulo inicial do botão (SSR) quando já vem `?processo_id=`.
- **`buscarProcessoGeralDaPasta(supabase, escritorioId, pastaId)` `→ string | null`**
  Substitui o `todosProcessos.find(p => p.pastaId===… && p.tipo==='geral')` que
  hoje depende de carregar a lista toda (usado quando a tela recebe `?pasta=`).
- **`existeAlgumProcesso(supabase, escritorioId)` `→ boolean`**
  `select id … limit 1` para o guard "sem nenhum processo → manda cadastrar".

### 3. `app/api/busca/processos/route.ts` (novo — Route Handler GET)

`GET /api/busca/processos?q=&offset=` → `criarClienteServidor()` + `exigirSessao`
→ `buscarProcessosParaSelecao` → JSON
`{ itens: { id, primario, secundario }[], temMais }`.
**O endpoint** monta `primario`/`secundario` (via `linhasDoProcesso` do
`lib/domain/rotulo-processo.ts`), deixando o componente genérico e burro.
`proxy.ts` já não redireciona `/api/*`.
`limite` fixo no servidor (~30).

### 4. `components/BuscaSeletor.tsx` (novo — client, genérico)

```
<BuscaSeletor
  name="processo_id"
  endpoint="/api/busca/processos"
  valorInicial={campos.processoId}
  rotuloInicial={rotuloInicialProcesso}   // string | null (SSR)
  textoVazio="Selecione o processo…"
  tituloModal="Buscar processo"
  placeholder="Número, pasta, cliente ou parte…"
  required
/>
```

- Resting: `<button type="button">` mostrando `rotuloInicial ?? textoVazio` +
  `<input type="hidden" name={name} defaultValue={valorInicial}>`. Funciona
  dentro do `<form method="get">` do prazo **e** dos `<form action={serverAction}>`
  de compromisso/monitoramento sem mudança nas actions.
- Modal: overlay `position:fixed` (sem portal), `role="dialog"` `aria-modal`,
  `aria-labelledby`. Input com autofocus.
- Busca: debounce ~250ms, `AbortController` cancela a anterior. Ao abrir, busca
  `q=""` (página 0).
- Scroll infinito: sentinela + `IntersectionObserver` → `offset += limite`,
  anexa. Estados "buscando…" / "nada encontrado" / erro.
- Teclado: ↑/↓ move o realce, Enter escolhe, Esc fecha, clique no fundo fecha,
  Tab presa no modal.
- Escolher → seta o hidden input + o texto do botão, fecha. (Sem tocar na URL —
  paridade com o `<select>` de hoje. Sync com `?processo=` p/ troca de aba fica
  como polish futuro.)
- Genérico: **não** conhece "processo"; recebe `endpoint` e textos. Cliente e
  pasta reusam depois.

### 5. Ligar em `atividades/nova`

- **`app/(app)/atividades/nova/page.tsx`**: troca `listarProcessosParaSelecao`
  (carrega tudo) por: `existeAlgumProcesso` (guard do redirect) +
  `buscarProcessoParaSelecao(processoSelecionado)` (rótulo inicial) +
  `buscarProcessoGeralDaPasta` (quando vem `?pasta=`). Passa `rotuloInicial` e
  `processoSelecionado` para os 3 formulários; deixa de passar `processos[]`.
- **`formulario-prazo.tsx`**, **`formulario-compromisso.tsx`**,
  **`formulario-monitoramento.tsx`**: `<SelecaoProcesso …>` → `<BuscaSeletor …>`.
  No prazo, o `<input hidden name="processo_id">` continua dentro do
  `<form method="get">` — "Calcular prazo" submete igual.
- **`components/SelecaoProcesso.tsx`**: apagar.
- Texto de ajuda dos 3 forms hoje diz *"O 'geral da pasta' é o trabalho da pasta
  sem processo formal"* → reescrever sem o jargão (ex.: *"Para trabalho da pasta
  sem processo formal, escolha a própria pasta."*).
- `formulario-prazo` também usa `campos.processoId` p/ `salvarPrazo` hidden e p/
  disparar o cálculo — inalterado (lê da URL após o GET).

### 6. `app/globals.css`

Classes novas seguindo o design system (`.card`, acento teal): `.modal-overlay`,
`.modal-cartao`, `.busca-linha` (+ `[data-realce]`). Nada de cor solta.

### 7. Testes

- `lib/domain/rotulo-processo.test.ts`: unit puro de `linhasDoProcesso` — geral
  (com/sem nome de pasta), judicial, administrativo, sem número, sem pasta;
  garante que a palavra "geral" nunca vaza pro rótulo.
- **Sem teste de integração para `buscarProcessosParaSelecao`**: como todo o
  resto de `lib/db/*`, é código de client Supabase e a base não testa isso em
  `tests/` (lá só entram schema/constraints via `pg` e funções puras de
  mapeamento). O `pg` roda numa transação isolada que o PostgREST não enxerga,
  então não dá pra exercitar a função de verdade. Cobertura fica na verificação
  no localhost (abaixo) + `tsc`/`build`.

---

## Fora do escopo (follow-ups, listar no PR)

1. Reusar `BuscaSeletor` para **cliente** (`pastas/nova`, `pastas/[id]`) e
   **pasta** (`processos/novo`, filtros de `agenda`/`processos`,
   `publicacoes/[id]`) — cada um com seu endpoint `/api/busca/*`.
2. Filtros por coluna no modal (estilo VBA: Justiça/Vara/Ação/Autor/Réu).
3. Sync da escolha com `?processo=` p/ preservar na troca de aba.
4. Índice `pg_trgm` se o `ilike` ficar lento com volume real (migration aditiva).
5. "Últimos usados" no topo do estado inicial.

---

## Verificação

**Verde obrigatório antes do PR:**

```
npx tsc --noEmit
npx eslint .
npx vitest run
npm run build
```

**No localhost (o Jefferson roda — Claude não abre localhost):**

1. `/atividades/nova` aba **Prazo** → clicar no campo de processo → modal abre
   listando tudo; rolar (scroll infinito carrega mais).
2. Buscar por: CNJ com pontuação · só dígitos · código de pasta `2025/000001` ·
   nome de pasta · nome de cliente · nome de parte contrária. Cada um traz o
   processo certo.
3. Escolher um → modal fecha, botão mostra o rótulo, "Calcular prazo" gera a
   memória (prova que `processo_id` foi no GET).
4. Abas **Compromisso** e **Monitoramento**: mesma escolha, `Salvar` grava
   (prova que o hidden input foi na Server Action).
5. Vindo de `publicacoes/[id]` → "Lançar o prazo →" (`?processo_id=…`): o botão
   já abre com o processo pré-selecionado.
6. `?pasta=<id>` (link "+ Prazo" da lista de pastas): pré-seleciona a própria
   pasta (processo `geral`).
7. Teclado: ↓/↑/Enter/Esc no modal.
8. Login como membro **sem `processos.ver`**: modal não vaza processo nenhum
   (comportamento igual ao de hoje).

**Sem migration** → nada a aplicar no banco.
