# MYOFFICE — PLANO DO MVP (reinício)

**Documento vivo.** Base para recomeçar o desenvolvimento. Contexto histórico: `MYOFFICE_AUDITORIA.md` (congelado).
Última atualização: 2026-08-30.

> **Estado (2026-08-30):** Etapas 1, 2, **3a**, **3c** e **5** feitas e **deployadas** — https://new-my-office.vercel.app
> (Vercel, projeto `new-my-office` / time JefersonSilvaAdv, auto-deploy no push da `master`).
> Repo: github.com/JJ-Silva/NewMyOffice.
> **Etapa 1**: 3 tipos de atividade + motor de prazo (T1–T13) + agenda + auth + multi-tenant.
> **Etapa 2**: `processo_judicial`/`administrativo`/`parte`, `lib/domain/cnj.ts` (dígito
> verificador), telas de processos + detalhe/edição de pasta + partes, prazo ligado a processo.
> **Etapa 3a**: `atividade_recorrencia` + `lib/domain/recorrencia.ts` (intervalo/semanal/mensal,
> fim por data/nº/indefinido); materialização em janela rolante (90d) na agenda + "gera a
> próxima ao concluir"; bloco "Repetir" nos formulários; tela `/recorrencias`.
> **Etapa 3c**: visão calendário (`/agenda/calendario`) — grade mês/semana, navegação
> ‹ Hoje ›, filtros pasta/tipo, toggle Lista⇄Calendário. `lib/domain/grade-calendario.ts`.
> Sincronização com Google Calendar: descartada (decisão 2026-08-30).
> **Etapa 5 (import DJEN)** feita fora de ordem (2026-08-30): `oab_monitorada` + `publicacao`,
> `lib/djen/comunica-api.ts`, `lib/domain/publicacao.ts`, telas `/publicacoes` (busca +
> triagem) e `/publicacoes/[id]` (cadastra processo na hora / vincula / vira prazo).
> **Cron diário** (Vercel Cron `0 10 * * *` → `/api/cron/buscar-djen`, service_role +
> CRON_SECRET) busca o dia; janelas maiores são manuais.
> **3b (alertas por e-mail) adiado para o final** (decisão 2026-08-30).
> Próximo: Etapa 4 (documentos) · 6 (papéis/convites) · 7 (relatórios).

---

## 0. Disciplina do reinício

Depois de **~15 reinícios em 5 anos** (ver auditoria), as regras deste reinício:

1. **Fatia vertical fina e persistida antes de tudo.** Nada de scaffolding grande, nada de "arquitetar direito primeiro".
2. **Não reiniciar.** Este é o repositório. Refino de arquitetura acontece dentro dele.
3. **Não replicar Clean Architecture em projetos separados nem arquitetura de plugins** — foram o que matou as tentativas anteriores.
4. **Persistência real desde a primeira feature.** O `MyOffice-CORE` fez domínio + testes + shell e travou por nunca ter ligado um banco.
5. **O que se aproveita da história é o desenho** (modelo de dados, regras de prazo, parsing CNJ), **não o código**.

**Meta da fatia vertical (≈2 semanas):** cadastrar cliente → abrir pasta → lançar 1 prazo (tipo + evento + data) → motor calcula fatal/interno com feriados nacionais → prazo aparece na lista ordenada por vencimento → marcar como cumprido. **Deployado na Vercel.** Multi-tenant já ligado. Sem processo judicial, sem CNJ, sem compromissos ainda.

---

## 1. Stack e estrutura

**Stack-alvo:** Next.js (App Router) + Supabase (Postgres + Auth + Storage) + Vercel. TypeScript. Testes com Vitest. Sem ORM pesado — client Supabase / queries diretas.

> **Requisito transversal:** o código tem de ser **auditável e editável pelo autor** (advogado). Ver §1.1 — vale para toda decisão técnica daqui pra frente.

**Estrutura por pastas (camada = pasta, não projeto):**
```
app/                 rotas (App Router), Server Components, Server Actions
  (auth)/            login, cadastro, troca de escritório
  prazos/            lista/agenda + form de lançamento
  pastas/  clientes/ configuracoes/
components/           UI
lib/
  domain/            regras puras, testáveis (motor de cálculo de prazo, parsing CNJ) — SEM dependência de Supabase
  db/                acesso a dados (queries Supabase, tipadas)
  supabase/          clients (server/browser), helpers de sessão + escritório ativo
supabase/
  migrations/        SQL versionado
  seed/              catálogos (tipo_prazo, area, feriados nacionais)
tests/               Vitest — unit (lib/domain) + integração (lib/db contra Supabase local)
```

**Não fazer:** projetos `.Domain`/`.Application`/`.Infrastructure` separados; camada de "repositórios" com interfaces genéricas; sistema de plugins; dois clients de banco.

**Multi-tenant desde o dia 1** (ver §3.1). Retrofit de multi-tenancy é migração cara — não adiar.

### 1.1 Código auditável pelo autor *(requisito de primeira ordem)*

O autor (advogado, não dev profissional) tem de **conseguir ler, entender e editar manualmente** qualquer parte do código. Regras:

- **Explícito > esperto.** Nada de abstração "genial", meta-programação, currying, mágica de tipos. Se precisa de um comentário pra explicar *como*, reescreve mais simples.
- **Funções pequenas, um propósito, nome que diz o que faz.** Domínio em português (`calcularPrazoFatal`, `pularFeriados`, `contarDiasUteis`).
- **Um conceito por arquivo.** Pasta rasa. O nome do arquivo diz o que tem dentro.
- **Comentário explica o *porquê*, não o *o quê*.** No motor de cálculo: comentar cada regra com o artigo do CPC / a decisão do plano correspondente.
- **`lib/domain/` é TypeScript puro** — sem Supabase, sem React, sem async desnecessário. É o código que o autor mais vai auditar (cálculo de prazo = responsabilidade civil). Deve ler como a função VBA `Contar_Prazos` que ele já entende.
- **Mínimo de dependências.** Cada pacote novo = mais coisa pra auditar e aprender. Preferir o que já vem no Next/Supabase. Sem lib de datas pesada se `Date` + funções próprias resolvem (e resolvem — o cálculo é dia-a-dia).
- **Acesso a dados em `lib/db/`, um arquivo por entidade** (`lib/db/prazos.ts`, `lib/db/pastas.ts`), funções nomeadas (`listarPrazosDaAgenda`, `criarPasta`) com SQL/query Supabase visível — sem query builder dinâmico.
- **Migrations SQL legíveis e comentadas** — o autor deve entender o schema lendo o `.sql`.
- **Sem geração de código / scaffolding automático que ele não entenda.** Se uma ferramenta gerar algo, ele revisa antes de commitar.
- **Tipos explícitos** nas fronteiras (retornos de função, props). Sem `any`.
- **Testes são documentação.** Cada regra do motor tem um teste com nome em português descrevendo o caso (ver `MYOFFICE_MOTOR_TESTES.md`).

---

## 2. Roadmap funcional

Cada etapa termina com algo **usável e deployado**.

| Etapa | Entrega | Depende de |
|---|---|---|
| **1** | **Os 3 tipos de atividade** (`prazo` + `compromisso` + `monitoramento`): cadastrar, editar, concluir cada um · **agenda unificada** com visibilidade por tipo · **motor de cálculo de prazo** · multi-tenant + auth | — |
| 2 | CRUD completo de Pastas e Processos; partes; **parsing + validação do nº CNJ** | 1 |
| ~~3a~~ | ✅ **Recorrência** (compromissos e monitoramentos) — `atividade_recorrencia` + `lib/domain/recorrencia.ts` + materialização (janela rolante 90d + próxima ao concluir) + tela `/recorrencias` | 1 |
| 3b | **Alertas/notificações** (e-mail) — o que torna a agenda útil de verdade. **Adiado para o final** (decisão 2026-08-30) — precisa de provedor de e-mail + cron | 1 |
| ~~3c~~ | ✅ **Visão calendário** (`/agenda/calendario`) — grade mês/semana, nav ‹ Hoje ›, filtros, toggle Lista⇄Calendário. Sync com calendário externo: descartado | 1 |
| 4 | Documentos: modelos, geração, Storage (Word → pasta de modelos / PDF → pasta do cliente; API Google Drive) | 2 |
| ~~5~~ | ✅ Import de publicações do **DJEN** — `oab_monitorada` + `publicacao` · `lib/djen/comunica-api.ts` (API pública do CNJ) · `lib/domain/publicacao.ts` (limpa HTML, normaliza CNJ, sugere tipo/dias) · tela `/publicacoes` (busca + triagem, auto-match CNJ) · triar → cadastra processo na hora ou vincula → vira prazo (reusa o form + motor). Feito antes da 3b — o alerta é plus, não bloqueio | 2 |
| 6 | Papéis e permissões refinados (dono / advogado / secretaria — o que cada um vê e faz); convites de membro | 1 |
| 7 | Relatórios e produtividade | 2 |

**Notas:**
- **Decisão 29/08:** os **3 tipos de atividade entram na Etapa 1**. O sistema de tipos (base compartilhada + herança + agenda dinâmica) é **arquitetura**, não feature — construir uma vez, certo, evita o retrabalho de "colar depois" que quebrou o `Modular→MyOffice`. Custo: Etapa 1 vai de ~2 para **~4 semanas** (mas a 1ª fatia deployável continua sendo ~2 semanas — só prazo).
- **Recorrência fica de fora da Etapa 1** — é **aditivo** (as colunas FK já existem nulas na base `atividade`), sem retrabalho. Na Etapa 1, atividade recorrente é recriada à mão.
- **Recorrência não se aplica a `prazo`** (`REGRAS_TIPO.prazo.podeRecorrer = false`).
- **DJEN** (Etapa 5, ✅ feita 2026-08-30) usa a API pública `comunicaapi.pje.jus.br` — casa publicação → processo pelo nº CNJ (Etapa 2). O alerta por e-mail (3b) é um plus, não era bloqueio.

---

## 3. Modelo de dados

**Convenções (todas as tabelas de domínio):**
- `id uuid` (default `gen_random_uuid()`).
- `escritorio_id uuid not null` → RLS.
- `criado_em timestamptz default now()`, `atualizado_em timestamptz` (trigger), `deletado_em timestamptz null` (**soft-delete em tudo** — dado jurídico não se apaga; toda query filtra `deletado_em is null`).
- Tabelas de detalhe 1:1 (`processo_judicial`, `atividade_prazo`…) carregam `escritorio_id` denormalizado para a RLS não precisar de JOIN.
- Enums: usar `text` + `check` constraint (mais fácil de evoluir no Supabase que `create type`).

### 3.1 Multi-tenant e identidade

```
escritorio
  id, nome (not null), cnpj (null),
  criado_em, atualizado_em, deletado_em

usuario                       -- perfil; id espelha auth.users.id do Supabase
  id (uuid, pk = auth.users.id),
  nome, email,
  criado_em, atualizado_em, deletado_em

membro                        -- usuário 1:N escritório
  id, usuario_id (fk usuario), escritorio_id (fk escritorio),
  papel (text check in: 'dono' | 'advogado' | 'secretaria'),   -- Etapa 1 usa dono/advogado; Etapa 6 refina
  ativo (bool default true),
  criado_em, deletado_em,
  unique (usuario_id, escritorio_id)
```

```
configuracao_escritorio       -- 1:1 com escritorio; onde vive a config global
  escritorio_id (pk, fk),
  margem_prazo_interno_dias (int default 5),           -- v1: dias úteis (prazo processual)
  agenda_janela_dias (int default 30),                 -- janela padrão da lista de atividades
  atualizado_em
```

- **Criação da linha `usuario`:** trigger `handle_new_user` em `auth.users` (padrão Supabase) cria o perfil ao cadastrar.
- **Onboarding:** cadastro (Supabase Auth) → cria `escritorio` + `configuracao_escritorio` → cria `membro` (papel `dono`) → **copia o seed** de `area` e `tipo_atividade` para o escritório. **`tribunal` e `feriado` NÃO são semeados** (P3b/c) — o autor cadastra em Configurações. Um escritório novo começa com **zero feriados** → o aviso do motor (§4.B item 7) é essencial no início.
- **Escritório ativo:** o usuário pode ter vários `membro`; a sessão guarda o `escritorio_id` ativo (cookie/estado). Toda query usa esse valor.
- **RLS (toda tabela de domínio):**
  ```sql
  create policy tenant_isolation on <tabela>
    using (escritorio_id in (
      select escritorio_id from membro
      where usuario_id = auth.uid() and ativo and deletado_em is null
    ));
  ```
  (função `escritorios_do_usuario()` encapsula o subselect.)
- **LGPD:** região do projeto Supabase = **South America (São Paulo) / `sa-east-1`** (decidido 2026-08-29). Projeto real criado; ref `udlxhzhcmluwfnntmsyf`. Migrations da Etapa 1 aplicadas.

### 3.2 Catálogos (por escritório — copiados no onboarding)

```
area
  id, escritorio_id, nome, ativo (bool default true), ordem (int)
  -- seed: Cível, Trabalhista, Criminal, Tributário, Previdenciário, Família,
  --       Empresarial, Imobiliário, Consumidor, Administrativo, Consultivo

-- tipo_atividade (catálogo dos "tratamentos" dos 3 tipos de atividade) → ver §3.6

tribunal                      -- órgãos onde o escritório atua — cada um tem seu calendário de feriados
  id, escritorio_id,
  nome (not null), sigla (not null),
  esfera (text check in: 'estadual'|'federal'|'trabalhista'|'eleitoral'|'superior'|'administrativo'),
  uf (text null),
  ativo (bool default true)
  -- onboarding sugere: TJ<uf do escritório>, TRF da região, TRT da região, STJ, STF — o autor ajusta

feriado                       -- cadastro MANUAL; cada feriado diz em QUAIS tribunais não há expediente
  id, escritorio_id,
  data (date not null),
  descricao (not null),
  repete_todo_ano (bool default false)                 -- se true, vale mês/dia todo ano

feriado_tribunal              -- N:N — tribunais SEM expediente nesse feriado
  feriado_id (fk), tribunal_id (fk),
  primary key (feriado_id, tribunal_id)

periodo_nao_util              -- recesso forense e afins (intervalo)
  id, escritorio_id,
  data_inicio (date), data_fim (date), descricao (not null),
  repete_todo_ano (bool default false)

periodo_nao_util_tribunal     -- N:N
  periodo_id (fk), tribunal_id (fk),
  primary key (periodo_id, tribunal_id)
```

- **Feriados = 100% manuais e por tribunal** (P3b/c). Sem seed. O autor cadastra em **Configurações**: primeiro os `tribunal` onde atua, depois os feriados de cada um (data + descrição), incluindo os nacionais (25/12 etc.), estaduais, Carnaval/Corpus, e o **recesso** como um `periodo_nao_util` por tribunal (P12).
- O motor usa o **`tribunal` do prazo** (`atividade_prazo.tribunal_id`) para saber quais feriados aplicar.
- **Móveis** (Carnaval, Paixão, Corpus…): cadastro manual a cada ano. O motor **avisa** quando o intervalo do cálculo não tem feriados cadastrados para aquele tribunal — a rede de segurança contra "esqueci de cadastrar".

### 3.3 Cliente

```
cliente
  id, escritorio_id,
  nome (not null),
  cpf_cnpj (text not null),                            -- OBRIGATÓRIO (não é PK; PK continua id uuid)
  tipo_pessoa (text check in: 'fisica' | 'juridica'),
  criado_em, atualizado_em, deletado_em,
  unique (escritorio_id, cpf_cnpj) where deletado_em is null
```
*(Etapa 2: endereços, e-mails, telefones em tabelas próprias — modelo antigo.)*

### 3.4 Pasta

```
pasta
  id, escritorio_id,
  ano (int not null), sequencial (int not null),       -- contador reinicia por ano
  codigo (text not null),                              -- 'AAAA/NNNNNN' derivado de ano+sequencial, imutável
  nome (text null),                                    -- livre, não único
  referencia_externa (text null),                      -- importar pastas antigas
  area_id (fk area, not null),
  objetivo (text null),                                -- o que se busca
  objeto (text null),                                  -- sobre o que é
  status (text check in: 'ativa' | 'arquivada' | 'suspensa' default 'ativa'),
  criado_em, atualizado_em, deletado_em,
  unique (escritorio_id, ano, sequencial),
  unique (escritorio_id, codigo)

pasta_cliente
  pasta_id (fk), cliente_id (fk),
  primary key (pasta_id, cliente_id)
```
- **Geração do código:** na criação, `sequencial = coalesce(max(sequencial) filter (where ano = <ano atual>), 0) + 1` para o escritório, dentro de transação; `codigo = ano || '/' || lpad(sequencial::text, 6, '0')`.
- **Exibição:** tem `nome` → mostra nome (código pequeno ao lado); senão → mostra código. Busca em ambos + em `referencia_externa`.

### 3.5 Processo (herança: base + detalhe por tipo)

```
processo                      -- base — toda consulta de agenda/lista passa por aqui
  id, escritorio_id,
  pasta_id (fk, not null),
  tipo (text check in: 'geral' | 'judicial' | 'administrativo'),   -- extensível: 'arbitral', ...
  numero (text null),                                  -- nulo no 'geral'
  status (text check in: 'ativo' | 'suspenso' | 'arquivado' | 'encerrado' default 'ativo'),
  polo_cliente (text null check in: 'autor' | 'reu' | 'terceiro'),  -- nulo no 'geral' (migration usa estes valores — decisão 2026-08-29)
  data_inicio (date null), data_fim (date null),
  observacoes (text null),
  criado_em, atualizado_em, deletado_em
  -- regra (aplicada no código, no fluxo de criar pasta): toda pasta cria exatamente 1 processo 'geral'.
  -- constraint parcial: unique (pasta_id) where tipo = 'geral'

processo_judicial             -- detalhe 1:1
  processo_id (pk, fk), escritorio_id,
  cnj (text null),
  cnj_segmento (int null), cnj_tribunal (int null), cnj_origem (int null),
  cnj_ano (int null), cnj_sequencial (bigint null), cnj_dv (int null),   -- Etapa 2 preenche via parsing
  justica (text null check in: 'estadual'|'federal'|'trabalho'|'eleitoral'|'militar'),
  vara (text null), comarca (text null), instancia (text null),
  tipo_acao (text null), juizo (text null),
  valor_causa (numeric null), data_distribuicao (date null), situacao (text null)

processo_administrativo        -- detalhe 1:1
  processo_id (pk, fk), escritorio_id,
  numero_adm (text null), orgao_julgador (text null), secretaria (text null),
  esfera (text null check in: 'federal'|'estadual'|'municipal'),
  tipo (text null), assunto (text null),
  autoridade_competente (text null), protocolo (text null), data_protocolo (date null)

-- novos tipos (arbitral, mediação/CEJUSC, tribunal de contas, PAD): nova tabela processo_<tipo> + valor no check de processo.tipo

parte                         -- Etapa 2
  id, escritorio_id, processo_id (fk),
  nome (not null),
  tipo_parte (text: 'reu'|'autor'|'litisconsorte'|'terceiro'|'assistente'|'interessado'),
  cpf_cnpj (text null), advogado_adverso (text null), oab_adverso (text null),
  criado_em, deletado_em
```

### 3.6 Atividade — a base compartilhada e os 3 tipos *(decisão 29/08: os 3 tipos entram na Etapa 1)*

Vem do `MyOffice-CORE` (`ActivityBase` + `DeadlineActivity` / `AppointmentActivity` / `MonitoringActivity`). É o que faz a agenda ser inteligente. **Herança: base `atividade` + tabela de detalhe por tipo** (mesmo padrão de `processo`).

#### Comportamento por tipo (constante, em código — `lib/domain/atividade.ts`, comentada)

| `tipo` | Exemplos | Persiste na agenda? | Dias antes de aparecer (padrão) | Pode recorrer? |
|---|---|---|---|---|
| **`prazo`** (`DeadlineActivity`) | Contestação, apelação, prazo material | **sim** (fica até cumprir/vencer) | **0** (aparece já) | **não** |
| **`compromisso`** (`AppointmentActivity`) | audiência, reunião, perícia | não (só na janela) | **5** | sim *(Etapa 3)* |
| **`monitoramento`** (`MonitoringActivity`) | verificar publicação, acompanhar andamento, checar certidão | não (só no dia) | **0** | sim *(Etapa 3)* |

```ts
// lib/domain/atividade.ts
export const REGRAS_TIPO = {
  prazo:         { persisteNaAgenda: true,  diasAntesVisivelPadrao: 0, podeRecorrer: false },
  compromisso:   { persisteNaAgenda: false, diasAntesVisivelPadrao: 5, podeRecorrer: true  },
  monitoramento: { persisteNaAgenda: false, diasAntesVisivelPadrao: 0, podeRecorrer: true  },
} as const;
```

#### Agenda dinâmica — `atividadeVisivelEm(atividade, dataAgenda)` (função pura)

```
status concluída ou cancelada            → não aparece
persisteNaAgenda e status pendente       → sempre aparece
tem data → aparece de (data − diasAntesVisivel) até a data
diasAntesVisivel = dias_antes_visivel_custom ?? REGRAS_TIPO[tipo].diasAntesVisivelPadrao
```

#### Prioridade efetiva — **calculada**, não gravada (função pura). 4 níveis: `baixa` / `media` / `alta` / `urgente`

```
atrasada / vence hoje / vence amanhã   → 'urgente'
vence em ≤ 5 dias úteis                → 'alta'
senão                                  → prioridade_manual
```

#### Esquema

```
tipo_atividade                -- catálogo (era "tipo_prazo" / "Tratamento"). Dá o título padrão da atividade.
  id, escritorio_id, nome (not null),
  aplica_a (text check in: 'prazo' | 'compromisso' | 'monitoramento'),
  -- campos usados só quando aplica_a='prazo':
  dias_padrao (int null),
  natureza (text null check in 'processual'|'material'|'interna'),   -- v1 só calcula 'processual'
  exige_peca (bool default false), categoria (text null),
  ativo (bool default true)
  -- seed 'prazo': §4.A.4 · seed 'compromisso': Audiência, Reunião com cliente, Perícia, Sustentação oral
  --            · seed 'monitoramento': Verificar publicação, Acompanhar andamento, Verificar certidão

atividade                     -- base (= ActivityBase)
  id, escritorio_id,
  processo_id (fk, not null),                          -- SEMPRE; "atividade da pasta" usa o processo 'geral'
  tipo (text check in: 'prazo' | 'compromisso' | 'monitoramento'),
  tipo_atividade_id (fk tipo_atividade),
  titulo (text not null),                              -- pré-preenchido com tipo_atividade.nome; editável
  descricao (text null),
  data (date not null),                               -- prazo fatal / data do compromisso / dia da verificação
  responsavel_id (fk membro, null),
  prioridade_manual (text check in: 'baixa'|'media'|'alta'|'urgente' default 'media'),
  -- prioridade_efetiva NÃO é coluna — é calculada (4 níveis, ver acima)
  status (text check in: 'pendente' | 'em_andamento' | 'concluida' | 'cancelada' default 'pendente'),
  data_conclusao (date null), concluida_por (fk membro, null), observacao_conclusao (text null),
  dias_antes_visivel_custom (int null),               -- sobrepõe o padrão do tipo, por atividade
  -- recorrência: colunas nullable já existem; o motor de recorrência é Etapa 3
  recorrencia_id (fk atividade_recorrencia, null),
  e_instancia_recorrente (bool default false),
  atividade_origem_id (fk atividade, null),
  criado_em, atualizado_em, deletado_em
  -- "atrasada/vencida" NÃO é status — é derivado: status='pendente' AND data < current_date

atividade_prazo               -- detalhe 1:1 (tipo='prazo') (= DeadlineActivity)
  atividade_id (pk, fk), escritorio_id,
  configuracao_contagem_id (fk configuracao_contagem),
  tribunal_id (fk tribunal, null),                     -- obrigatório p/ natureza='processual' (define o calendário de feriados). Etapa 2: migra p/ processo_judicial
  -- (o "tipo de prazo" fica em atividade.tipo_atividade_id)
  -- termo inicial (evento) — colunas, não tabela
  evento_tipo (text check in: 'disponibilizacao_djen' | 'intimacao_pessoal' | 'juntada' | 'ciencia' | 'outro'),
  evento_data (date not null),                         -- data da disponibilização (DJEN) ou do evento; é o "dia 1" da contagem (Opção A)
  evento_descricao (text null),
  excluir_feriados (bool default true),
  -- datas: calculada + adotada
  prazo_fatal_calculado (date),
  prazo_fatal (date),                                  -- ADOTADA (a que vale). atividade.data É MANTIDA IGUAL a esta.
  prazo_fatal_ajustado_manual (bool default false),
  prazo_interno_calculado (date),
  prazo_interno (date),                                -- adotada
  prazo_interno_ajustado_manual (bool default false),
  prazo_apertado (bool default false),
  motivo_ajuste (text null),
  calculo_desatualizado (bool default false),
  memoria_calculo (jsonb),
  check (not (prazo_fatal_ajustado_manual or prazo_interno_ajustado_manual)
         or motivo_ajuste is not null)
  -- REGRA: sempre que prazo_fatal muda, o código atualiza atividade.data = prazo_fatal
  --        (atividade.data é a fonte única para agenda/prioridade dos 3 tipos)
  -- data-alvo direta (natureza='interna'): prazo_fatal_ajustado_manual=true, prazo_fatal_calculado=evento_data, dias=0

atividade_compromisso         -- detalhe 1:1 (tipo='compromisso') (= AppointmentActivity)
  atividade_id (pk, fk), escritorio_id,
  hora (time null),
  local (text null),
  duracao_estimada_min (int null)
  -- reagendar: atualiza atividade.data + grava observação automática "de X para Y, motivo Z"

atividade_monitoramento       -- detalhe 1:1 (tipo='monitoramento') (= MonitoringActivity)
  atividade_id (pk, fk), escritorio_id,
  alvo (text null),                                   -- o que verificar (nº processo, certidão, órgão…)
  ultima_verificacao (timestamptz null)
  -- registrar verificação: grava observação (resultado + achou_mudanca), atualiza ultima_verificacao,
  --   se achou_mudanca e prioridade < alta → eleva; se ok e sem recorrência → conclui

configuracao_contagem         -- tabela referenciada por atividade_prazo
  id, escritorio_id,
  dobro (bool default false),                          -- prazo em dobro (situação da parte)
  natureza (text check in: 'processual'|'material'|'interna'),   -- copiada do tipo_atividade, editável
  dias (int),                                          -- copiado de tipo_atividade.dias_padrao, editável
  criado_em, deletado_em

observacao                    -- histórico de anotações na atividade
  id, escritorio_id, atividade_id (fk),
  texto (not null), autor_id (fk membro),
  criado_em, deletado_em

prazo_historico               -- auditoria SÓ do prazo (parte legalmente sensível)
  id, escritorio_id, atividade_id (fk),
  alterado_por (fk membro), alterado_em (timestamptz default now()),
  campo (text: 'prazo_fatal'|'prazo_interno'|'evento_data'|'evento_tipo'|'tipo_prazo'|'configuracao'|'status'),
  valor_anterior (jsonb), valor_novo (jsonb),
  motivo (text null)
```

**Fica para a Etapa 3:** `atividade_recorrencia` (template + regra: tipo, intervalo, dias-da-semana, condição de fim) + o motor que gera as próximas instâncias. As colunas de FK já existem nulas na base `atividade`, então é aditivo — **sem retrabalho no modelo**. Na Etapa 1, monitoramento/compromisso recorrente é recriado à mão.

---

## 4. ETAPA 1 — Atividades (os 3 tipos) + motor de prazo (detalhada)

**Objetivo:** o advogado gerencia **tudo que tem data** num só lugar — prazos, audiências/reuniões e monitoramentos — cada um aparecendo na agenda no momento certo. O prazo tem o motor de cálculo; os outros dois são data + campos próprios.

**Ordem de construção dentro da Etapa 1:**
1. **Semanas 1–2 — fatia vertical `prazo`** (ver §4 "Fatia vertical mínima"): prova o pipeline inteiro (auth → escritório → cliente → pasta → prazo → cálculo → agenda → concluir), deployado.
2. **Semanas 3–4 — `compromisso` e `monitoramento`**: reusam toda a base (tabela `atividade`, agenda, fluxo de concluir). Adiciona 2 formulários, 2 tabelas de detalhe, e a agenda passa a aplicar a **visibilidade por tipo** (`atividadeVisivelEm`, §3.6).

### Bloco A — Cadastros de apoio

**A.1 Cliente** — nome, cpf_cnpj, tipo_pessoa. CRUD simples. (§3.3)

**A.2 Pasta** — código (auto), nome (opcional), área, objetivo, objeto, status, cliente(s) N:N. (§3.4) — a pasta cria automaticamente seu `processo` tipo `geral`.

**A.3 Processo** — na Etapa 1 **não é necessário** um processo judicial/administrativo para lançar prazo (o `geral` da pasta cobre). Um form mínimo de processo judicial/administrativo (número + tipo de ação/assunto + polo do cliente) é **opcional** aqui; CRUD completo + parsing CNJ = Etapa 2.
- **Fluxo de lançar prazo:** escolhe a **pasta** → escolhe o **processo** dentro dela (default: o `geral`; na Etapa 1, em geral só existe o geral) → tipo de prazo → evento + data.
- **"Prazo" na UI** = uma linha de `atividade` (`tipo='prazo'`) + seu detalhe `atividade_prazo`. O usuário nunca vê "atividade" — vê "prazo".

**A.4 Tipo de atividade** (catálogo `tipo_atividade`, §3.6 — historicamente "tipo_prazo" / "Tratamento") — o título da atividade vem daqui. Para `aplica_a='prazo'`, escolher o tipo copia `dias_padrao` + `natureza` para a `configuracao_contagem` da instância (editáveis lá).
- **Prazo em dobro NÃO é atributo do tipo** — é `configuracao_contagem.dobro` do prazo lançado, default `false`.
- Seeds `compromisso`: Audiência · Reunião com cliente · Perícia · Sustentação oral · Despacho com juiz.
- Seeds `monitoramento`: Verificar publicação · Acompanhar andamento processual · Verificar certidão · Conferência de pasta.
- **Seed `prazo` (revisar antes do build):**

| nome | dias_padrao | natureza | exige_peca | categoria |
|---|---|---|---|---|
| Contestação | 15 | processual | sim | resposta |
| Réplica | 15 | processual | sim | resposta |
| Apelação | 15 | processual | sim | recurso |
| Contrarrazões de apelação | 15 | processual | sim | recurso |
| Agravo de instrumento | 15 | processual | sim | recurso |
| Embargos de declaração | 5 | processual | sim | recurso |
| Recurso especial / extraordinário | 15 | processual | sim | recurso |
| Contrarrazões a REsp/RE | 15 | processual | sim | recurso |
| Manifestação sobre documentos/laudo | 15 | processual | não | manifestacao |
| Especificação de provas | 5 | processual | não | manifestacao |
| Cumprimento de sentença — pagamento voluntário | 15 | processual | não | cumprimento |
| Impugnação ao cumprimento de sentença | 15 | processual | sim | cumprimento |
| Embargos à execução | 15 | processual | sim | resposta |
| Alegações finais / memoriais | 15 | processual | sim | manifestacao |
| Interna — elaboração de peça/contrato | (informa dias) | interna | sim | providencia_interna |
| Interna — organização de documentos | (informa dias) | interna | não | providencia_interna |
| Prazo próprio do cliente (ex.: juntar documento) | (informa dias) | interna | não | providencia_interna |
| Outro / livre — processual | (informa dias) | processual | (escolhe) | — |

*("Ciência" saiu do catálogo — publicação sem prazo não gera atividade. **`natureza='material'`** (prescrição, decadência) **não é calculada no v1** — se um tipo material for usado, a UI pede a data do prazo direto.)*

**A.5 Responsável** — `atividade.responsavel_id` → `membro` (existe desde a Etapa 1, §3.1). Default: o membro que lançou. Editável.

### Bloco B — Motor de cálculo (`lib/domain/prazo.ts`, funções puras, testadas com Vitest)

**Referência:** porte fiel da função VBA `Contar_Prazos`, usada em produção pelo autor por anos. Princípio: **"sempre errei pelo seguro — nunca perder prazo"**.

**Escopo v1:** calcula `processual` **e** `interna` — ambos em **dias úteis** (P10). Diferença: `processual` exige `tribunal_id` (para os feriados) e usa a semântica "disponibilização = dia 1"; `interna` tem `tribunal_id` **opcional** (se nulo, pula só sábado/domingo). `material` (prescrição/decadência) → **não calculado**, a UI pede a data direto.

**Entrada:** `data_inicial` (processual = disponibilização; interna = data de início); `N` (de `configuracao_contagem.dias`, default `tipo_atividade.dias_padrao`); `dobro` (bool); `excluir_feriados` (bool, default true); `tribunal_id` (obrigatório se processual); `margem` (de `configuracao_escritorio`).

**Algoritmo:**

1. Se `dobro` → `N = N × 2`.
2. **Dia 1 = a própria `data_inicial`** — **não** se exclui o dia do começo. Se `data_inicial` não for dia útil, o dia 1 é o **primeiro dia útil seguinte**.
   - *Opção A (deliberada):* contando da **disponibilização** como dia 1, o prazo fatal sai **~2 dias úteis antes** do CPC estrito (art. 224 §§2º–3º). Margem de segurança embutida, validada por anos de uso da planilha. Os marcos CPC ficam na memória de cálculo, informativos.
3. **Contagem:** a partir do dia 1, avança dia a dia até somar `N` **dias úteis**. Dia útil = **não** sábado, **não** domingo, e (se `excluir_feriados`) **não** feriado nem dia dentro de `periodo_nao_util` **daquele `tribunal_id`** (`feriado` ⨝ `feriado_tribunal`, `periodo_nao_util` ⨝ `periodo_nao_util_tribunal`).
4. **`prazo_fatal_calculado`** = data do `N`-ésimo dia útil contado. (Em modo úteis o resultado é sempre útil por construção — não há prorrogação a fazer.)
5. **Prazo interno** = `prazo_fatal_calculado` menos `margem` **dias úteis** (contados para trás; sempre cai em dia útil). Se `N − margem ≤ 0` → `prazo_interno_calculado = max(data_inicial, hoje)` e `prazo_apertado = true`. O interno **não** tem regra de prorrogação (Q3 = não).
6. **`memoria_calculo`** (jsonb):
   `{ data_inicial, tipo_evento, N_dias, dobro, tribunal, dia_1, dias_pulados: [{data, motivo: 'fim de semana'|'feriado: <descr>'|'recesso: <descr>'}], prazo_fatal_calculado, margem, prazo_interno_calculado, marcos_cpc: { publicacao, inicio_contagem, prazo_fatal_cpc_estrito } }`
7. **Aviso de calendário incompleto:** se `[data_inicial, prazo_fatal]` cruza mês/ano **sem nenhum feriado cadastrado para aquele tribunal** → aviso na UI ("confira o cálculo").
8. **Sem suspensão/interrupção no v1.** Desvio (processo suspenso, recesso atípico, acordo) → advogado ajusta `prazo_fatal` manualmente com `motivo_ajuste`.
9. **`natureza='interna'`** — a UI pede **quantos dias** (P8); mesmo algoritmo em **dias úteis** (P10), mas `data_inicial` = data de início informada e `tribunal_id` é opcional (nulo → pula só sáb/dom). Tem `prazo_interno = fatal − margem` (Q2 = sim). Sem marcos CPC.
10. **`natureza='material'`** — não calculado no v1: a UI pede a **data do prazo** direto (`prazo_fatal_ajustado_manual=true`); `prazo_interno = fatal − margem` úteis.

**Data calculada × data adotada:**
- `prazo_fatal` / `prazo_interno` (adotadas) nascem iguais às `*_calculado`.
- O advogado pode sobrescrever qualquer uma → `*_ajustado_manual = true`, `motivo_ajuste` **obrigatório**, grava em `prazo_historico`.
- Corrigir `prazo_fatal` re-deriva `prazo_interno` (fatal − margem), **salvo** se `prazo_interno_ajustado_manual = true`.
- Se `evento`/`tipo_prazo`/`configuracao` mudarem depois de um ajuste manual: **não apagar** o valor adotado — recalcular os `*_calculado`, setar `calculo_desatualizado = true`, e a UI oferece "re-adotar o valor recalculado".
- A tela sempre mostra: "sistema calculou **X** · adotado **Y** — motivo: …".

### Bloco C — Agenda unificada (senão a atividade é write-only — o erro do CORE)

**C.1 Lista / agenda** — atividades do escritório ativo (os 3 tipos juntos), ordenadas por `data` asc. Aparecem conforme `atividadeVisivelEm(atividade, hoje)` (§3.6): prazo sempre; compromisso 5 dias antes; monitoramento no dia. Janela padrão da lista: `configuracao_escritorio.agenda_janela_dias` (30) + todos os atrasados.
**C.2 Filtros** — tipo (prazo/compromisso/monitoramento), pasta, responsável, status, "só atrasados". Toggle "ver tudo" ignora a visibilidade dinâmica.
**C.3 Estados visuais** (por `data` e, no prazo, pelo `prazo_interno`):
- **Atrasada** — `pendente` e `data < hoje` (vermelho)
- **Vence/é hoje** — `data = hoje`
- **Dentro da margem** *(só prazo)* — `hoje >= prazo_interno` e `data > hoje` (amarelo — "hora de fazer")
- **Prazo apertado** *(só prazo)* — `prazo_apertado = true` (badge)
- **Prioridade efetiva** — badge calculado (`urgente` / `alta`) quando aplicável
- **Concluída** / **Cancelada** — esmaecida
**C.4 Concluir** — `status='concluida'`, `data_conclusao`, `concluida_por`, `observacao_conclusao`.
- `prazo`: "como foi cumprido".
- `compromisso`: "realizado" (+ observação opcional).
- `monitoramento`: **Registrar verificação** (resultado + "achou mudança?"). Se achou mudança → eleva prioridade + gera observação; se ok e sem recorrência → conclui.
**C.5 Cancelar** — `status='cancelada'` + observação.
**C.6 Ações por tipo** — `prazo`: ajustar datas (com motivo → `prazo_historico`). `compromisso`: **reagendar** (registra "de X para Y, motivo"). `monitoramento`: agendar próxima verificação.
**C.7 Observações** (`observacao`) — anotações livres, com autor e data. Prorrogações/reagendamentos/verificações geram observação automática.
**C.8 Detalhe** — do prazo: memória de cálculo, calculado × adotado, `prazo_historico`.

### Bloco D — Infra

**D.1 Supabase Auth** — e-mail/senha (Google auth = Etapa posterior). Sessão guarda `escritorio_id` ativo.
**D.2 Migrations** — `supabase/migrations/`; tabelas de §3.1–§3.6; RLS em todas.
**D.3 Seed** — no onboarding, copia só `area` e `tipo_atividade` (prazo + compromisso + monitoramento). **Sem** tribunais nem feriados (P3b/c) — o autor cadastra em Configurações.
**D.4 `atualizado_em`** — trigger genérico; soft-delete respeitado em todas as queries. `atividade.data` mantida = `atividade_prazo.prazo_fatal` para o tipo prazo.
**D.5 Índices** — criados junto com as migrations (item de build, não de modelagem): agenda (`atividade` por escritório+status+data), `atividade_prazo` por prazo_fatal, `feriado_tribunal`, FKs.

### Fatia vertical mínima (≈2 semanas — só o tipo `prazo`)
`app/(auth)` cadastro/login → cria escritório + seed → **Configurações: cadastra 1 tribunal + alguns feriados** → `clientes/novo` → `pastas/nova` (cria processo geral) → `atividades/nova` tipo prazo (tipo + tribunal + data da disponibilização → `lib/domain/prazo.ts` = porte da `Contar_Prazos`) → `agenda` (lista ordenada, estados visuais) → concluir. Deploy Vercel + Supabase. **Sem** compromisso/monitoramento ainda (semanas 3–4), sem processo judicial, CNJ, notificações, recorrência.

---

## 5. Decisões travadas

**Stack / arquitetura**
- Next.js App Router + Supabase (Postgres+Auth+Storage) + Vercel + TypeScript + Vitest.
- Camada = pasta (`app/`, `lib/domain`, `lib/db`). Sem projetos separados, sem plugins, sem ORM pesado.
- Multi-tenant desde o dia 1.

**Tenancy / identidade**
- Multi-escritório (SaaS). Usuário **1:N** escritório via tabela `membro` (papel: dono/advogado/secretaria).
- `escritorio_id` + RLS em toda tabela de domínio. Catálogos copiados por tenant no onboarding.
- **Autorização (P6):** o `dono`/administrador concede permissões aos demais membros. **Etapa 1:** toda ação de negócio (prazos, pastas, clientes) liberada a qualquer membro ativo; **só o `dono` acessa Configurações** (feriados, tribunais, catálogos, membros). O código chama `podeFazer(membro, acao)` desde já (hoje quase sempre `true`) — o gate fino é a Etapa 6.
- `cliente.cpf_cnpj` é **obrigatório** (não é PK), único por escritório.

**Pastas / Processos** (schema em §3.4–§3.5; justificativa dos 3 conflitos resolvidos em `MYOFFICE_AUDITORIA.md` — histórico)
- Todo prazo → `processo_id` obrigatório. Toda pasta nasce com 1 `processo` tipo `geral` (representa o trabalho interno; "atividade na pasta" = no geral). A criação (pasta + processo geral) é **atômica** — recomendado via trigger `after insert on pasta`, para não existir pasta sem geral.
- Herança de processo: base `processo` + tabela de detalhe 1:1 por tipo. Novo tipo = nova tabela + valor no check.
- Parte contrária → vinculada ao **processo**. Polo do cliente (ativo/passivo) = campo do processo.
- Pasta pode ter 0 processos judiciais/administrativos. Pasta identificada por `codigo` auto `AAAA/NNNNNN` (reinicia por ano, imutável) **+** `nome` livre opcional não-único **+** `referencia_externa` opcional.
- Campos: `objetivo` (o que se busca) × `objeto` (sobre o que é). `area` = catálogo configurável pré-carregado. Status pasta: ativa/arquivada/suspensa. Cliente N:N.

**Atividade — sistema de tipos** *(decisão 29/08)*
- `atividade` base + `tipo` ∈ {prazo, compromisso, monitoramento} + tabela de detalhe por tipo (herança, igual a processo). **Os 3 tipos entram na Etapa 1** — o sistema de tipos é arquitetura, não feature; construir uma vez evita o retrabalho de "colar depois".
- Comportamento por tipo (`REGRAS_TIPO`, constante em `lib/domain/atividade.ts`): persiste-na-agenda, dias-antes-visível-padrão, pode-recorrer. Ver §3.6.
- **Agenda dinâmica** — `atividadeVisivelEm(atividade, data)` (função pura): concluída/cancelada nunca; prazo pendente sempre; compromisso/monitoramento na janela `[data − diasAntesVisível, data]`. `dias_antes_visivel_custom` sobrepõe o padrão por atividade.
- **Prioridade efetiva calculada** (não gravada) — **4 níveis** (baixa/media/alta/urgente): urgente se vence hoje/amanhã/atrasada; alta se ≤ 5 dias úteis; senão a manual.
- **`atividade.data`** é a fonte única de data para agenda/prioridade dos 3 tipos. Para prazo, é mantida = `atividade_prazo.prazo_fatal` (adotado).
- `status` ∈ {pendente, em_andamento, concluida, cancelada}. **Atrasada = derivado** (`pendente AND data < hoje`), não é status.
- `titulo` **obrigatório**, pré-preenchido com `tipo_atividade.nome`, **editável** (P5).
- "Ciência" **saiu do catálogo** (P9) — publicação sem prazo não gera atividade.
- **Recorrência fica para a Etapa 3a** — aditivo (colunas FK já nulas na base), sem retrabalho. **Não** se aplica a `prazo`.
- **`tipo_atividade`** = catálogo único com `aplica_a` ∈ {prazo, compromisso, monitoramento}; campos `dias_padrao`/`natureza`/`exige_peca` só usados quando `aplica_a='prazo'`. **Sem** campo "dobro".
- **Prazo em dobro** = flag `configuracao_contagem.dobro` do prazo lançado (default off) — depende da situação da parte, não do tipo.
- `configuracao_contagem` = **tabela** referenciada por `atividade_prazo` (FK).
- Termo inicial (evento) = `evento_tipo` + `evento_data` (colunas em `atividade_prazo`). `tribunal_id` também em `atividade_prazo` (define o calendário; migra p/ `processo_judicial` na Etapa 2).
- **Motor de cálculo = porte da função VBA `Contar_Prazos`.** **v1 calcula `processual` e `interna`, ambos em dias úteis** (P10). `interna`: `tribunal_id` opcional (nulo → pula só sáb/dom). `material` → UI pede a data direto (não calculado).
- **Opção A: `evento_data` = data da disponibilização é o dia 1** (não se exclui o dia do começo) — ~2 dias úteis mais conservador que o CPC estrito, por escolha do autor ("sempre pelo seguro"). Marcos CPC na memória de cálculo, informativos.
- Duas datas: **fatal** e **interno** ("primeiro prazo para concluir"). Cada uma: versão **calculada** + **adotada**.
- Margem do prazo interno = **5 dias úteis** (processual), config em `configuracao_escritorio`, editável. Interno = `fatal − margem` (úteis para trás; sempre cai em dia útil — **não prorroga**, Q3). Borda: `N − margem ≤ 0` → `interno = max(evento_data, hoje)` + `prazo_apertado`. Para `interna`, interno = `fatal − margem` também (Q2).
- Correção manual de qualquer data → `motivo_ajuste` obrigatório + `prazo_historico`. Mudança de input após ajuste → `calculo_desatualizado`, não apaga o adotado.
- **Sem suspensão/interrupção de prazo no v1** — vira ajuste manual.
- **"Sábado útil" removido** (CPC 216).

**Calendário**
- Feriados = **100% manuais e por tribunal** (P3b/c/P12). Tabelas: `tribunal` + `feriado` + `feriado_tribunal` (N:N) + `periodo_nao_util` + `periodo_nao_util_tribunal`. **Sem seed** — o autor cadastra em Configurações (tribunais primeiro, depois feriados de cada um; recesso como `periodo_nao_util`).
- O prazo aponta o `tribunal_id`; o motor usa só os feriados daquele tribunal.
- Escritório novo = **zero feriados**. O motor **avisa** quando o intervalo do cálculo não tem feriados cadastrados para aquele tribunal — rede de segurança.

**Higiene**
- Soft-delete (`deletado_em`) em todas as tabelas. Sem credenciais no repo (`.env` / Supabase secrets).
- `prazo_historico` = auditoria só do prazo (não auditoria geral no v1).

---

## 6. Decisões pendentes / a validar

**Fechadas nas rodadas 28–29/08:** P2, P3 (feriados manuais por tribunal, **sem seed** — P3b/c), P5 (título editável), P6 (autorização básica), P7 (cpf obrigatório), P8+P10 (`interna` pede dias, conta em **dias úteis**), P9 (Ciência removida), P11 (índices = build, eu resolvo), P12 (recesso = `periodo_nao_util` por tribunal), Q2/Q3/Q4, motor v1 = processual + interna (material fora).

| # | Pendência aberta | Quem decide |
|---|---|---|
| **P1** | **Validação do motor** — conferir T1–T13 do `MYOFFICE_MOTOR_TESTES.md` (as datas) + a Opção A. **É o único bloqueio para codar o motor.** | Jefferson (advogado) |
| ~~P4~~ | ~~**Região de hospedagem do Supabase** (LGPD)~~ — ✅ **fechada 2026-08-29:** São Paulo / `sa-east-1` | — |
| P13 | **Câmaras** — feriado/suspensão por câmara (não só tribunal)? Fora do v1 — um `tribunal` pode representar uma câmara se preciso | Etapa 2+ |

---

## 7. Riscos

| Risco | Mitigação |
|---|---|
| **Reinício nº 16** (stack nova + tela em branco → re-arquitetar) | Fatia vertical persistida em 2 semanas. Regras do §0. Nada de scaffolding grande. |
| Cálculo de prazo errado (responsabilidade profissional) | Motor = funções puras 100% cobertas por testes; memória de cálculo visível; **data adotada** sempre editável pelo advogado; P1 validado antes do build. |
| RLS mal configurada → vazamento de dados de cliente | Policy única por tenant, testada com usuário de outro escritório; revisão antes de cada deploy. |
| Curva de React/Next para perfil C#/VBA | Escopo mínimo; `lib/domain` é TS puro (familiar); UI simples (lista + form). |
| Feriados desatualizados → cálculo silenciosamente errado | Aviso do motor quando falta feriado no intervalo; onboarding já popula o ano corrente. |
