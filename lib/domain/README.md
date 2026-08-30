# lib/domain — regras de negócio puras

**TypeScript puro.** Nada de Supabase, nada de React, nada de I/O. São funções que recebem dados e devolvem dados — 100% testáveis com Vitest.

O que mora aqui:
- `datas.ts` — datas como texto `'AAAA-MM-DD'`, cálculo dia-a-dia via UTC. Sem lib externa.
- `prazo.ts` — `calcularPrazo()` (porte da função VBA `Contar_Prazos` — ver `docs/referencia/funcao-vba-Contar_Prazos.txt` e `docs/MYOFFICE_MOTOR_TESTES.md`). Testes T1–T13 em `prazo.test.ts`.
- `atividade.ts` — `REGRAS_TIPO`, `atividadeVisivelEm()`, `prioridadeEfetiva()`, `estadoNaAgenda()` (ver `docs/MYOFFICE_MVP_PLANO.md` §3.6 e §4 Bloco C).
- `cnj.ts` — parsing/validação do número CNJ (Res. CNJ 65/2008 — dígito verificador MOD 97-10). `analisarCnj`, `montarCnj`, `calcularDigitoVerificador`. Testes em `cnj.test.ts`.
- `autorizacao.ts` — `podeFazer(membro, acao)` (ver plano §5, decisão P6). Etapa 1: só `dono` acessa Configurações.

Regras (do plano §1.1): explícito > esperto; funções pequenas com nome em português; comentar o *porquê* (citar o artigo do CPC); sem dependências externas de data — `Date` + funções próprias.
