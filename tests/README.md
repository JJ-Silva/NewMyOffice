# tests

Testes de integração (lib/db + schema, contra um Postgres real). Testes de
lógica pura ficam ao lado do código, em `lib/domain/*.test.ts`.

## Rodar os de integração

Precisam da variável `DATABASE_URL` apontando para o banco (o Session pooler do
Supabase serve). **Sem ela, esses testes são pulados** (`describe.skip`) e o
`npm test` normal só roda os de unidade.

```
DATABASE_URL="postgresql://postgres.<ref>:<senha>@<host-do-pooler>:5432/postgres" npm test
```

Cada teste roda numa transação com `rollback` no fim — não deixa dados no banco.
A conexão é como `postgres` (ignora a RLS de propósito, para poder inspecionar
o schema).

- `recorrencia-integracao.test.ts` — Etapa 3a: valida a migration
  `atividade_recorrencia` (colunas, CHECKs, FK `ON DELETE SET NULL`, índice
  único) e o ida-e-volta `colunasDaRegra` ⇄ `regraDaLinha`.
