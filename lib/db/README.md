# lib/db — acesso a dados

Um arquivo por entidade (`prazos.ts`, `pastas.ts`, `clientes.ts`, `tribunais.ts`, `feriados.ts`, ...).

Cada arquivo exporta funções nomeadas com a query Supabase **visível** — sem query builder dinâmico, sem repositório genérico. Exemplos: `listarAgenda(escritorioId, ...)`, `criarPasta(...)`, `concluirPrazo(...)`.

A RLS do Postgres já isola por `escritorio_id` — mas passe o `escritorioId` explicitamente nas queries para clareza.

As funções recebem o client Supabase como 1º argumento (testável, e serve tanto ao server quanto às Server Actions).

Criados no Passo 3: `membros.ts` (vínculo usuário↔escritório), `escritorios.ts` (onboarding via RPC).
Criados no Passo 4: `tribunais.ts`, `feriados.ts`, `periodos-nao-uteis.ts` (Configurações; soft-delete via `update deletado_em`).
Criados no Passo 6: `clientes.ts`, `pastas.ts` (o código e o processo geral vêm dos triggers), `areas.ts`.
Criados no Passo 7: `configuracao.ts`, `tipos-atividade.ts`, `processos.ts`, `calendario.ts` (monta o `Calendario` do motor a partir dos feriados do tribunal), `atividades.ts` (`criarPrazo` — os 3 inserts; a trigger sincroniza `atividade.data`).
Criados no Passo 8: `agenda.ts` (lista), `atividade-detalhe.ts` (detalhe + observações + histórico), `atividade-acoes.ts` (concluir/reativar/cancelar/anotar/ajustar datas — ajuste grava `prazo_historico`).

**Semanas 3–4 da Etapa 1:** `atividades.ts` ganha `criarCompromisso` / `criarMonitoramento`; `atividade-acoes.ts` ganha `registrarVerificacao` (monitoramento: eleva prioridade se achou mudança, senão conclui). A agenda aplica `atividadeVisivelEm` (§3.6): prazo sempre, compromisso 5 dias antes, monitoramento no dia — toggle "ver tudo" e filtro de status ignoram.

