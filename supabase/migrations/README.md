# migrations

SQL versionado do esquema. Roda em ordem de nome (timestamp). Aplicar: `npm run db:reset`.

## Estado atual — esquema da Etapa 1 criado e **aplicado no Supabase real**

Projeto `udlxhzhcmluwfnntmsyf` (região `sa-east-1`). As 7 migrations abaixo foram aplicadas via
`supabase db push` em 2026-08-29 (sem Docker local — não há Docker nesta máquina).
Para reaplicar/sincronizar: `npx supabase db push --db-url "<connection string do Session pooler>"`.


| Arquivo | O que cria |
|---|---|
| `..._base.sql` | extensão pgcrypto, função `set_atualizado_em()` |
| `..._multitenant.sql` | `escritorio`, `usuario`, `membro`, `configuracao_escritorio` · trigger `handle_new_user` · helper `escritorios_do_usuario()` · RLS |
| `..._catalogos.sql` | `area`, `tipo_atividade` · RLS |
| `..._calendario.sql` | `tribunal`, `feriado`, `feriado_tribunal`, `periodo_nao_util`, `periodo_nao_util_tribunal` · RLS |
| `..._cliente_pasta_processo.sql` | `cliente`, `pasta` (+ trigger de código `AAAA/NNNNNN`), `pasta_cliente`, `processo` (base) (+ trigger que cria o processo `geral`) · RLS |
| `..._atividade.sql` | `configuracao_contagem`, `atividade`, `atividade_prazo` (+ trigger que sincroniza `atividade.data`), `atividade_compromisso`, `atividade_monitoramento`, `observacao`, `prazo_historico` · RLS |
| `..._onboarding.sql` | função `onboarding_criar_escritorio(nome)` — cria escritório + membro dono + config + copia catálogos padrão |

| `..._processo_judicial_administrativo_parte.sql` | **Etapa 2** — `processo_judicial` (CNJ + componentes), `processo_administrativo`, `parte` · RLS |
| `..._recorrencia.sql` | **Etapa 3a** — `atividade_recorrencia` (template + regra de repetição + fim) · FK e índice único de `atividade.recorrencia_id` · RLS |
| `..._djen_publicacao.sql` | **Etapa 5** — `oab_monitorada` (OABs a buscar no DJEN) · `publicacao` (comunicações trazidas + triagem nova/descartada/virou_prazo) · RLS |
| `..._processo_geral_numero.sql` | O processo `geral` passa a gravar o código da pasta em `numero` (trigger + backfill) — todo processo tem número identificador |
| `..._atividade_titulo_opcional.sql` | `atividade.titulo` (e o da recorrência) vira nullable — em branco = NULL; a UI cai no nome do `tipo_atividade` |

## Regras
- Uma migration por mudança. Nunca editar uma já aplicada em produção — criar outra.
- Gerar novas com `supabase migration new <nome>`.
- SQL legível e comentado (o autor precisa entender o schema lendo o `.sql`).
- Toda tabela de domínio: `escritorio_id` + RLS + soft-delete (`deletado_em`).
