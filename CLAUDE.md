# MyOffice — instruções para o Claude Code

Sistema de gestão para escritório de advocacia. Começa pelo **controle de prazos**.

## Leitura obrigatória antes de codar
1. `docs/MYOFFICE_MVP_PLANO.md` — a especificação (stack, modelo de dados §3, Etapa 1 §4, decisões travadas §5)
2. `docs/MYOFFICE_MOTOR_TESTES.md` — casos de teste do motor de cálculo de prazo
3. `docs/referencia/funcao-vba-Contar_Prazos.txt` — a função VBA que o motor porta

`INICIO-AQUI.md` (raiz) tem o passo a passo da primeira entrega.

## Stack
Next.js 16 (App Router) · Supabase (Postgres + Auth + Storage) · Vercel · TypeScript · Vitest · Tailwind.
Client Supabase / queries diretas — **sem ORM**.

## Regras inegociáveis (plano §0 e §1.1)
- **Fatia vertical fina e persistida antes de qualquer expansão. NÃO reiniciar o projeto.**
- **Sem** Clean Architecture em projetos separados, **sem** plugins, **sem** query builder dinâmico.
- **Código auditável por um advogado que também programa (C#/VBA):**
  - explícito > esperto — nada de meta-programação, abstração "genial", mágica de tipos
  - funções pequenas, um propósito, **nome em português** (`calcularPrazoFatal`, `contarDiasUteis`)
  - um conceito por arquivo; pasta rasa
  - comentário explica o **porquê** (no motor: citar o artigo do CPC)
  - `lib/domain/` = TypeScript puro (sem Supabase, sem React)
  - mínimo de dependências (sem lib de datas pesada — `Date` + funções próprias)
  - `lib/db/` = um arquivo por entidade, query visível
  - migrations SQL legíveis e comentadas
  - tipos explícitos nas fronteiras, sem `any`
- **Multi-tenant desde a 1ª migration:** `escritorio_id` + RLS em toda tabela de domínio.
- **Soft-delete** (`deletado_em`) em todas as tabelas.

## Estrutura
```
app/            rotas (App Router), Server Components, Server Actions
  (auth)/       login, cadastro, troca de escritório
lib/
  domain/       regras puras, testáveis (prazo, atividade, cnj)
  db/           acesso a dados (um arquivo por entidade)
  supabase/     clients server/browser + sessão
supabase/
  migrations/   SQL versionado
  seed.sql      catálogos do escritório de demo
tests/          integração (lib/db)
docs/           especificação + referência
```

## Modo de trabalho
- Commits pequenos, mensagem clara em português.
- Ao fim de cada passo do `INICIO-AQUI.md`: parar, mostrar, esperar OK.
- Decisão não coberta pelo plano → **perguntar**, não inventar.
- Nada de escopo além do que o passo atual pede.
