# MyOffice — Agenda e Prazos

Sistema de gestão para escritório de advocacia solo: controle de prazos processuais, publicações judiciais (DJEN) e casos (pastas/processos/clientes).

## Language

**Situação (estado da agenda)**:
Classificação derivada — nunca gravada — do tempo de uma atividade em relação a hoje: `atrasada` | `vence_hoje` | `hora_de_fazer` | `futura` | `concluida` | `cancelada`. Para um prazo, `hora_de_fazer` significa hoje ≥ prazo interno e o prazo fatal ainda não venceu. Calculada em `lib/domain/atividade.ts` (`estadoNaAgenda`).
_Avoid_: usar como sinônimo de Prioridade — são dois conceitos derivados independentes.

**Prioridade**:
Selo de triagem derivado — nunca gravado — usado para destacar itens na lista: `baixa` | `media` | `alta` | `urgente`. `urgente` = atrasada, vence hoje ou vence amanhã. `alta` = vence em até 5 dias úteis (ignora feriados — é heurística de destaque, não o cálculo do prazo). Calculada em `lib/domain/atividade.ts` (`prioridadeEfetiva`).
_Avoid_: tratar "urgente" como sinônimo de "atrasada" — um item pode estar `urgente` por vencer amanhã sem nunca ter estado atrasado.

**Tribunal (num prazo)**:
Define o calendário de feriados usado no cálculo de dias úteis. "Sem tribunal" é uma escolha válida e explícita — considera só sábados e domingos como não-úteis. Não é o mesmo que o campo ficar intocado: o campo exige uma escolha consciente (um tribunal real ou "Sem tribunal"), nunca assume silenciosamente.
_Avoid_: tratar "Tribunal vazio/intocado" e "Sem tribunal" (escolhido) como o mesmo estado.
