# lib/domain — regras de negócio puras

**TypeScript puro.** Nada de Supabase, nada de React, nada de I/O. São funções que recebem dados e devolvem dados — 100% testáveis com Vitest.

O que mora aqui:
- `prazo.ts` — cálculo de prazo (porte da função VBA `Contar_Prazos` — ver `docs/referencia/funcao-vba-Contar_Prazos.txt` e `docs/MYOFFICE_MOTOR_TESTES.md`).
- `atividade.ts` — `REGRAS_TIPO`, `atividadeVisivelEm()`, `prioridadeEfetiva()` (ver `docs/MYOFFICE_MVP_PLANO.md` §3.6).
- `cnj.ts` — parsing/validação do número CNJ (Etapa 2).

Regras (do plano §1.1): explícito > esperto; funções pequenas com nome em português; comentar o *porquê* (citar o artigo do CPC); sem dependências externas de data — `Date` + funções próprias.
