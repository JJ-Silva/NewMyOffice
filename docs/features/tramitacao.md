# Plano — Tramitação (fio cronológico de andamentos, por processo e por pasta)

> **Estado (2026-09-06): concluído, mergeado na `master` e deployado.**
> Migrations aplicadas: `20260906120000_andamento` (tabela + permissões) e
> `20260906130000_tramitacao_backfill` (histórico pré-feature, INSERT-only).
> Tela `/tramitacao` no menu lateral, fio estilo chat (ver "Revisão de design"
> na seção UI). As seções "Fatia vertical mínima" e "Checklist" abaixo são
> históricas.

---

## Context — por que mexer nisso

Hoje não existe um lugar único pra ver "o que aconteceu" num caso. A informação está
espalhada: `atividade.descricao`/`observacao_conclusao` (por atividade), `observacao`
(anotações e cancelamentos, também por atividade), `publicacao.motivo_descarte`
(publicações arquivadas) — cada uma só visível na sua própria tela, sem ordem
cronológica comum e sem noção de "isso é do processo X" ou "isso é da pasta inteira".

**Objetivo desta fatia:** um fio único, cronológico, por **processo** (e agregado por
**pasta**, somando os processos dela) — igual ao protótipo `docs/prototipo/` que o
Jefferson desenhou (`MyOffice — Tramitação`), mas **sem** os pedaços que dependem de
infraestrutura que ainda não existe (Storage, portal do cliente) ou de conceito que
ainda não foi desenhado (mini-tarefas).

### Decisões travadas (grilling — 4 rounds)

- **Nível:** `andamento.processo_id` **not null**, no mesmo padrão de `atividade`
  (§3.6 do plano). "Ver por pasta" = agrega os andamentos de todos os processos
  daquela pasta (join por `processo.pasta_id`); "ver por processo" = filtra direto
  pelo id. "Ver por cliente" fica de fora (join futuro por `pasta_cliente`).
- **Sem cliente no fio.** Rejeitado explicitamente — vira "chat várzea" de sugestão
  e direcionamento de trabalho vindo de quem não deveria opinar no andamento técnico.
- **Sem anexo nesta fatia.** Depende de Storage (Etapa 4, não construída). O desenho
  não bloqueia isso — anexo entra depois como uma peça adicional (provavelmente uma
  tabela `andamento_anexo` ou FK pro futuro `documento`), sem migração deste plano.
- **Sem filtro por papel/rótulo nesta fatia** — é um `WHERE` fácil de acrescentar
  depois, mas o fio cronológico completo já resolve o caso de uso agora.
- **Autoria é sempre real**, nunca "Sistema" fake — com uma única exceção genuína
  (publicação do DJEN, ver abaixo). Tudo que uma pessoa digita — justificativa,
  conclusão, motivo, ajuste, comentário livre — é atribuído a ela.
- **Tudo que referencia outra parte do sistema é link real** (FK), nunca texto solto
  fingindo ser um link: `atividade_id` e `publicacao_id`.
- **Duplicação de texto é intencional, não normalizada.** `andamento` é uma cópia
  read-only pra exibição cronológica; a fonte de verdade de cada fato continua em
  `atividade.descricao`, `atividade.observacao_conclusao`, `prazo_historico.motivo`,
  `publicacao.motivo_descarte` (nenhuma dessas colunas tem tela de edição hoje, então
  não existe risco real de desincronia). Inverter isso (a FK apontar de lá pra cá)
  criaria escrita em 2–3 passos coordenados pra gravar um texto que hoje é 1 coluna,
  e acoplaria a tela `/agenda/[id]` (já em produção) a uma feature nova. Ver
  `MYOFFICE_MVP_PLANO.md` §1.1 — explícito > esperto.
- **Mini-tarefas** (decompor "elaborar a Inicial" em subtarefas com estado próprio)
  é um conceito novo, fora de escopo — anotado como pendência futura (nível `P`, como
  as do §6 do plano principal), não travado aqui. O comentário manual já cobre o caso
  de uso ("minuta concluída") sem precisar de subtarefa.
- **Reagendar compromisso** (§4 C.6) ainda não foi construído no código (só está no
  plano) — não dá pra pendurar hook em função que não existe. Quando nascer, aplica
  o mesmo padrão do ajuste de prazo.
- **Reativar atividade** fica fora — é uma ação de desfazer, não produz fato novo
  pro histórico.

---

## Modelo de dados

```sql
-- supabase/migrations/<timestamp>_andamento.sql

create table andamento (
  id uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references escritorio(id),
  processo_id uuid not null references processo(id),

  -- quem escreveu; null SÓ quando origem='publicacao_djen' (conteúdo vindo do
  -- DJEN, sem nenhuma pessoa por trás daquele fato específico)
  autor_membro_id uuid null references membro(id),

  origem text not null check (origem in (
    'manual',                -- escrito direto na tela da Tramitação, sem vínculo
    'criacao_atividade',     -- justificativa preenchida ao criar prazo/compromisso/monitoramento
    'conclusao_atividade',   -- informação de conclusão (inclui monitoramento concluído por registrarVerificacao)
    'observacao_atividade',  -- adicionarObservacao: cancelamento, verificação com mudança, ou "anotar" livre
    'ajuste_prazo',          -- correção manual de prazo_fatal/prazo_interno (motivo obrigatório)
    'publicacao_djen'        -- publicação do DJEN que passou a ter processo_id (auto-match ou vínculo manual)
  )),

  atividade_id uuid null references atividade(id),     -- preenchido quando origem toca atividade
  publicacao_id uuid null references publicacao(id),   -- preenchido quando origem toca publicação

  texto text not null,

  criado_em timestamptz not null default now(),
  deletado_em timestamptz null
);

create index andamento_processo_idx on andamento (processo_id, criado_em desc)
  where deletado_em is null;

create policy tenant_isolation on andamento
  using (escritorio_id in (select escritorio_id from membro
    where usuario_id = auth.uid() and ativo and deletado_em is null));
```

**Permissões (Etapa 6 — precisa entrar no catálogo, não é opcional):**
`lib/domain/permissoes.ts` ganha um grupo `tramitacao` com `tramitacao.ver` e
`tramitacao.criar` (postar andamento manual). O `tem_permissao()` do RLS exige
`tramitacao.ver` no SELECT de `andamento`, igual às demais tabelas de domínio.
Sem isso a tabela nasce sem RLS de aplicação — só tenant isolation não basta
(ver CLAUDE.md: "ao mexer em schema, reler as policies RLS afetadas").

**`lib/db/andamentos.ts`** (novo, um arquivo, padrão do resto do `lib/db/`):
- `listarAndamentosDoProcesso(supabase, escritorioId, processoId)`
- `listarAndamentosDaPasta(supabase, escritorioId, pastaId)` — join por `processo.pasta_id`
- `criarAndamentoManual(supabase, { escritorioId, processoId, autorMembroId, texto })`
- `registrarAndamento(...)` — helper interno chamado pelos 6 gatilhos abaixo (mesma
  função, evita repetir o `insert` em 6 lugares diferentes)

---

## Gatilhos automáticos (todos aditivos — 1 insert a mais depois da escrita existente)

| Onde | O que já existe | O que muda |
|---|---|---|
| `app/(app)/atividades/nova/formulario-{prazo,compromisso,monitoramento}.tsx` | campo "Título (opcional)" já gravado em `atividade.titulo` | + campo **"Justificativa/observação (opcional)"**, grava em `atividade.descricao` (coluna já existe, hoje sempre `null`) |
| `app/(app)/atividades/nova/acoes.ts` (as 3 ações de criar) | insere a atividade | + se `descricao` preenchida, `registrarAndamento(origem='criacao_atividade', atividade_id, autor=quem criou, texto=descricao)` |
| `lib/db/atividade-acoes.ts` → `concluirAtividade` | grava `observacao_conclusao` | + se preenchida, `registrarAndamento(origem='conclusao_atividade', ...)` |
| `lib/db/atividade-acoes.ts` → `adicionarObservacao` | grava em `observacao` | + `registrarAndamento(origem='observacao_atividade', ...)` — cobre de graça `cancelarAtividade`, `registrarVerificacao` (achou mudança) e a ação `anotar` (`app/(app)/agenda/acoes.ts`), que já chamam essa função hoje |
| `lib/db/atividade-acoes.ts` → `ajustarDatasDoPrazo` | grava `prazo_historico` com `motivo` obrigatório | + `registrarAndamento(origem='ajuste_prazo', autor=quem ajustou, texto=motivo)` |
| `lib/db/publicacoes.ts` → `salvarComunicacoes` | insere publicação, já com `processo_id` se o CNJ casou | + se `processo_id` não é null, `registrarAndamento(origem='publicacao_djen', autor=null, publicacao_id, texto=resumo automático)` |
| `lib/db/publicacoes.ts` → `vincularProcessoNaPublicacao` | seta `processo_id` (correção manual, quando o auto-match falhou) | + mesmo `registrarAndamento(origem='publicacao_djen', ...)` — só dispara aqui se não disparou na captura |
| `lib/db/publicacoes.ts` → `arquivarPublicacao` | grava `motivo_descarte` | + **se** `processo_id` já setado **e** motivo preenchido, `registrarAndamento(origem='manual', autor=quem arquivou, publicacao_id, texto=motivo)` |

**Nota sobre um caso conhecido de texto parecido em dobro:** quando
`registrarVerificacao` conclui um monitoramento sozinho (sem achar mudança), ele já
grava hoje uma `observacao` ("Verificação: X — sem mudança") **e**
`observacao_conclusao` (o mesmo resultado) — duas colunas, texto quase igual. Isso é
redundância que já existe nas tabelas hoje, não é introduzida por esta feature; vai
só ficar visível como 2 andamentos parecidos nesse caso específico. Não mexer no
Bloco C.4 (já em produção) pra "consertar" isso — fora do escopo desta fatia.

---

## UI

> **Revisão de design (2026-09-06):** a 1ª entrega usava uma lista de cards em 2
> rotas escondidas dentro de `/pastas/[id]` e `/processos/[id]`. O Jefferson
> pediu o layout do protótipo `MyOffice — Tramitação` (grupo de mensagens) e
> acesso pelo **menu lateral**. As decisões abaixo substituem só a camada de
> exibição — migration, `lib/db/andamentos.ts` e os 6 gatilhos ficam como estão.

- **Rota única `app/(app)/tramitacao/page.tsx`**, item **"Tramitação" na sidebar**
  (gate `tramitacao.ver`). Query: `?processo=<id>&vista=caso|processo`.
  - Sem `?processo` → abre no processo com o **andamento mais recente**
    (`processoComAndamentoMaisRecente`); sem nenhum andamento → estado vazio + seletor.
  - **Seletor** = o modal de busca que já existe (`BuscaSeletor`/`SeletorProcesso`,
    endpoint `/api/busca/processos`), num wrapper client que navega ao escolher
    (`components/SeletorProcessoTramitacao.tsx`). **Não** é combobox.
  - **Alternância no cabeçalho:** `Este processo` (`listarAndamentosDoProcesso`)
    × `Caso inteiro` (`listarAndamentosDaPasta`, etiqueta "⚖ nº" em cada balão).
    Processo **sem pasta** → só `Este processo`. Default: `caso` quando há pasta.
  - Ao postar: em `vista=processo` grava no processo exibido; em `vista=caso`
    grava no `geral` da pasta.
- **`components/FioTramitacao.tsx` (client)** — fio em **balões de chat**:
  agrupado por dia (pílula `Hoje`/`Ontem`/`DD/MM/AAAA · dia-semana`), avatar com
  iniciais + cor determinística por `autor_membro_id` (null = "Sistema", teal),
  balão do autor logado à **direita** (verde), hora no rodapé, chip `⏳ ver <tipo>`
  quando `atividade_id`, `📄 ver publicação` quando `publicacao_id`. Compositor
  "Escrever um andamento…" + Enviar; rola pro fim ao abrir/ao chegar mensagem.
  **Sem filtro por participante** (fica pra depois), **sem anexo** (Storage/Etapa 4).
- **`/pastas/[id]/tramitacao` e `/processos/[id]/tramitacao` viram redirects**
  pra `/tramitacao?processo=…` (deep-links antigos continuam válidos). Os links
  "Tramitação" em `/pastas/[id]` e `/processos/[id]` seguem apontando pra elas.

---

## Fora de escopo (anotado, não esquecido)

- Anexos (Etapa 4 / Storage) — schema não bloqueia, sem coluna nova por enquanto.
- Cliente no fio — rejeitado por design, não é "ainda não".
- Filtro por participante/rótulo no fio — chips do protótipo; adiar (WHERE a mais).
- Ver por cliente (agregando pastas) — ideia anotada, sem desenho ainda.
- Mini-tarefas dentro de uma atividade — conceito novo, precisa de rodada própria.
- Reagendar compromisso → gerar andamento — função ainda não existe no código.
- Reativar atividade → gerar andamento — decidido que não gera.

---

## Fatia vertical mínima (ordem sugerida)

1. Migration (`andamento` + índice + RLS) + permissões `tramitacao.ver`/`tramitacao.criar`.
2. `lib/db/andamentos.ts` (listar por processo/pasta, `registrarAndamento`, `criarAndamentoManual`).
3. Hooks mais baratos primeiro (zero UI nova): `adicionarObservacao`,
   `concluirAtividade`, `ajustarDatasDoPrazo` — prova o pipeline com dado real.
4. Campo "Justificativa/observação" nos 3 formulários de criação + hook.
5. Hooks de publicação: `salvarComunicacoes`, `vincularProcessoNaPublicacao`, `arquivarPublicacao`.
6. `FioTramitacao` + as 2 rotas + os 2 links nas páginas existentes.
7. Testes: Vitest unit pra montagem do texto automático de publicação (função pura);
   integração pra `lib/db/andamentos.ts` (padrão de `tests/`).

## Checklist (§5 do `COMO-CRIAR-FEATURES.md`)

```
[ ] git checkout -b feat/tramitacao (a partir da master atualizada)
[ ] este arquivo commitado antes de codar
[ ] migration aditiva aplicada no banco de DEV
[ ] releitura das policies RLS afetadas (andamento é tabela nova — confirmar
    tem_permissao() com tramitacao.ver antes de declarar seguro)
[ ] codar em commits pequenos; a cada commit: tsc --noEmit, eslint, vitest, build
[ ] testar no localhost o fluxo inteiro (criar prazo com justificativa → aparece
    na Tramitação; concluir → aparece; ajustar data → aparece; publicação DJEN
    casada por CNJ → aparece; arquivar publicação com motivo → aparece)
[ ] /code-review
[ ] git push -u origin feat/tramitacao → PR → Preview da Vercel
[ ] aplicar migration em produção
[ ] merge na master
```
