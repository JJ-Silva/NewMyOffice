# Como criar features novas sem quebrar o MyOffice

O que quebra um projeto assim não é "feature nova" — é commit direto na `master`,
migration ruim no banco de produção, ou perder o fio do que já foi decidido.
Este fluxo ataca os três.

---

## 1. Branch — a regra que sozinha já protege

`master` = produção (a Vercel faz deploy automático no push). **Nunca** trabalhe nela.

```bash
git checkout master
git pull
git checkout -b feat/nome-da-feature
```

Na branch você commita à vontade, erra, reseta — a `master` e o site no ar não sentem
nada. A Vercel ainda dá um **Preview Deployment** (URL própria) para cada branch: dá
para testar "em produção de mentira" antes de mergear.

---

## 2. "Outra pasta" = git worktree (não clonar de novo)

Para ter a feature num diretório separado mantendo a `master` aberta noutro
(rodar o dev server nela, ou fazer um hotfix):

```bash
git worktree add ../MyOffice-featX feat/nome-da-feature
```

Cria `..\MyOffice-featX\` com a branch já checada — **mesmo repositório, mesmo
histórico**, sem re-clonar. Ao terminar:

```bash
git worktree remove ../MyOffice-featX
```

> A memória do Claude Code é por **caminho de pasta**. Um worktree tem memória vazia —
> não enxerga o `estado-do-projeto.md`. Por isso o passo 3: o plano tem que estar
> commitado no repo, não só na memória privada.

---

## 3. Contexto entre chats

**Chat novo na mesma pasta (`D:\NewMyOffice`):** já começa limpo da conversa, mas
carrega sozinho o `CLAUDE.md` e puxa a memória (`MEMORY.md` + arquivos) quando
relevante. Chat novo ≠ perder o que foi decidido.

**Chat/pasta diferente (worktree, clone):** a continuidade tem que estar **commitada**.
Todo plano de feature vira um `.md` versionado:

```
docs/features/<nome>.md
```

Escreva o plano **antes de codar** e commite primeiro. Viaja com a branch, qualquer
chat lê, e o "você de daqui a 3 meses" também.

### Prompt de abertura de um chat novo

> Leia `CLAUDE.md`, `docs/MYOFFICE_MVP_PLANO.md`, `MEMORY.md` e
> `docs/features/<nome>.md` se existir. Estou numa branch `feat/<nome>`.
> Vamos construir **\<descrição\>**. Primeiro planeje como **fatia vertical fina**
> e me mostre — não code ainda.

---

## 4. O banco é o único perigo de verdade

Hoje **localhost e produção usam o mesmo Supabase** (`udlxhzhcmluwfnntmsyf`).
Aplicar uma migration para testar = aplicou em produção. Duas saídas:

### Opção A (recomendada) — 2º projeto Supabase de dev

1. Dashboard Supabase → **New project** (free, região `sa-east-1`)
2. Copie URL + anon key + service_role para `.env.local` (que **não** vai para o git)
3. Aplique todas as migrations no banco limpo:
   ```
   supabase db push --db-url "<pooler do projeto DEV>"
   ```
4. Rode o onboarding no localhost (crie um escritório de teste)
5. Agora localhost bate no banco de dev; produção fica intocada. Só aplica no banco
   real quando for mergear.

### Opção B (leve) — disciplina de migration

- Só migration **aditiva**: coluna nova `nullable`, tabela nova. Nunca `drop`, nunca
  `not null` em coluna cheia, nunca renomear numa migration única.
- O **código tem que funcionar antes da migration rodar** (lê o novo com `?? null`).
- Aplica no banco real só no momento do merge.

> Em qualquer opção: ao mexer em schema, **releia as policies RLS afetadas** antes de
> concluir que a mudança é segura. (Ex.: "processo sem pasta" só foi seguro porque a
> RLS de `processo`/`atividade`/`parte` nunca passou pela pasta — isso teve que ser
> verificado, não presumido.)

---

## 5. Checklist por feature

```
[ ] git checkout -b feat/x   (a partir da master atualizada)
[ ] docs/features/x.md — plano em fatia vertical fina, commitar primeiro
[ ] codar em commits pequenos; a cada commit, verdes:
      npx tsc --noEmit   npx eslint .   npx vitest run   npm run build
[ ] migration (se houver): aditiva, aplicada no banco de DEV
[ ] testar no localhost o fluxo inteiro
[ ] /code-review  e corrigir o que voltar
[ ] git push -u origin feat/x  →  abrir PR  →  conferir o Preview da Vercel
[ ] aplicar a migration no banco de PRODUÇÃO (Prompt de Comando)
[ ] merge na master  →  deploy automático
[ ] git worktree remove / git branch -d feat/x
```

---

## 6. Aplicar migration (produção ou dev)

No **Prompt de Comando** (não PowerShell — bloqueia o `npx.ps1`):

```bat
cd /d D:\NewMyOffice
echo Y | npx supabase db push --db-url "<connection string do pooler>"
```

Produção: pooler do projeto `udlxhzhcmluwfnntmsyf` (Session pooler, porta 5432).
Dev: o pooler do 2º projeto.
