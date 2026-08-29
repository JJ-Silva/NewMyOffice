# lib/db — acesso a dados

Um arquivo por entidade (`prazos.ts`, `pastas.ts`, `clientes.ts`, `tribunais.ts`, `feriados.ts`, ...).

Cada arquivo exporta funções nomeadas com a query Supabase **visível** — sem query builder dinâmico, sem repositório genérico. Exemplos: `listarAgenda(escritorioId, ...)`, `criarPasta(...)`, `concluirPrazo(...)`.

A RLS do Postgres já isola por `escritorio_id` — mas passe o `escritorioId` explicitamente nas queries para clareza.
