# lib/db — acesso a dados

Um arquivo por entidade (`prazos.ts`, `pastas.ts`, `clientes.ts`, `tribunais.ts`, `feriados.ts`, ...).

Cada arquivo exporta funções nomeadas com a query Supabase **visível** — sem query builder dinâmico, sem repositório genérico. Exemplos: `listarAgenda(escritorioId, ...)`, `criarPasta(...)`, `concluirPrazo(...)`.

A RLS do Postgres já isola por `escritorio_id` — mas passe o `escritorioId` explicitamente nas queries para clareza.

As funções recebem o client Supabase como 1º argumento (testável, e serve tanto ao server quanto às Server Actions).

Criados no Passo 3: `membros.ts` (vínculo usuário↔escritório), `escritorios.ts` (onboarding via RPC).
Criados no Passo 4: `tribunais.ts`, `feriados.ts`, `periodos-nao-uteis.ts` (Configurações; soft-delete via `update deletado_em`).

