# Protótipo de telas — MyOffice

`MyOffice.dc.html` é um **canvas do Claude Design** (abre no navegador; editável no Claude Design). Este arquivo resume as telas e as decisões de UI para quem for implementar sem abrir o canvas.

> O protótipo mostra a visão **Etapa 1 + Etapa 2** (inclui compromisso/monitoramento e CRUD de processos com CNJ). Na 1ª entrega, implementar só o que o `INICIO-AQUI.md` pede; o resto do protótipo é referência para depois.

## Paleta

| Uso | Cor |
|---|---|
| Fundo da app | `#E6F2F3` |
| Superfície / cards | `#FFFFFF` |
| Tints (bordas, faixas, cabeçalho de tabela) | `#EDF5F5` · `#D6E7E8` · `#B9D4D3` |
| Texto principal | `#483D3F` |
| Texto secundário | `#736769` · placeholder `#8A7C7E` |
| Acento (links, foco, botões primários) | `#00727E` |
| Atrasado | `#DC2626` (fundo `#FEF2F2`, borda `#FCA5A5`) |
| Vence hoje / "hora de fazer" | `#F5C400` / `#FFCC00` |
| Cumprido | `#16A34A` |
| Aviso (feriados incompletos) | `#D97706` |

Fonte: **Inter**. Foco: `outline: 2px solid #00727E`.

Props globais do protótipo: `densidade` (compacta/média/confortável), `margemDias` (default 5, 1–10 dias úteis), `bannerAlertas` (on/off).

## Vocabulário de status (agenda)

`Atrasado` · `Vence hoje` · **`Hora de fazer`** (= dentro da margem: hoje ≥ prazo interno) · `Futuro` · `Adiado` · `Cumprido` · `Cancelado`

> Nota: o protótipo usa **"Hora de fazer"** (melhor que "dentro da margem") e inclui **"Adiado"** como status — decidir se entra no enum (`status` do plano hoje é pendente/em_andamento/concluida/cancelada). O `atrasado`/`vence hoje`/`hora de fazer`/`futuro` são **derivados** das datas, não status gravados.

## Telas

### 1. Entrada (landing + auth)
- Headline: *"Prazos calculados, conferidos e sempre à vista."* + 3 bullets (contagem em dias úteis com base legal citada · ajuste manual sempre com motivo · histórico completo por prazo).
- Abas **Entrar** / **Criar conta**. Campos: Nome do escritório, E-mail, Senha. Texto: *"O escritório é criado automaticamente com sua conta como administradora."* Link "Esqueci minha senha".

### 2. Layout (sidebar)
- Marca **MyOffice**, seção "Trabalho" com itens + badge de contagem. Rodapé: iniciais + nome do usuário + nome do escritório + **Sair**.

### 3. Agenda de atividades  *(tela central da Etapa 1)*
- Cabeçalho: título + `{hoje longo} · {resumo}` + botão **+ Nova atividade**.
- **Banner de alertas** (togglável): título + subtítulo + "Ver só esses".
- Navegação de data: `‹  Hoje  ›` + rótulo de referência + contexto + "Ir para".
- **Filtros**: Pasta · Responsável · Tipo de atividade (Prazo/Compromisso/Monitoramento) · Status · Ordenar por (data ↑/↓, prazo interno, pasta A–Z, cliente A–Z, tipo, responsável) · checkbox "Só atrasados" · "Limpar".
- **Tabela** com colunas reordenáveis/configuráveis (ícone ⇄ na coluna base) + "Legenda de status" (?).
  - Linha: identificação da pasta, identificação do processo, cliente, tipo, responsável, "quando" (principal + sub), ações **✓ Concluir** / **Reativar** / **⋮**.
- **Empty state** com título + texto.

### 4. Configurações  *(só administrador)*
- Texto: *"Tribunais e calendário de feriados do escritório. Só o administrador vê esta tela."*
- **Tribunais**: form (Nome, Sigla, Adicionar) + lista (sigla, nome, "X feriados", Excluir). Empty: *"Cadastre ao menos um para vincular feriados e calcular prazos."*
- **Feriados por tribunal**: form (Tribunal select, Data, Descrição, Adicionar) + lista (data, descrição, `tribunal · dia da semana`, Excluir). Empty: *"Sem feriados, o cálculo considera apenas sábados e domingos."*

### 5. Clientes
- Tabela: Cliente, CPF/CNPJ, Contato (telefone + e-mail), Pastas, Ação (**+ Pasta**, ⋮). **+ Novo cliente**.
- Empty: *"Comece por '+ Novo cliente' — o fluxo leva à criação da pasta."*
- Modal **Novo cliente**: Nome completo / razão social, CPF/CNPJ, Telefone, E-mail → botão **"Salvar e criar pasta"**.

### 6. Pastas
- Tabela: nome + `{código} · {cliente}`, área, "X processos", "X prazos abertos", Ação (**Atividades**, ⋮). **+ Nova pasta**.
- Texto: *"Cada pasta recebe um código automático no formato AAAA/NNNNNN."*
- Modal **Nova pasta**: Cliente vinculado, Código (readonly), Nome da pasta (opcional), Área, Objetivo → botão **"Salvar e cadastrar processo"**.

### 7. Processos  *(Etapa 2)*
- Filtros: Pasta, Fase. Tabela: número CNJ + "Distribuído em …", pasta+cliente+valor, tribunal+vara, fase, Ação (**+ Atividade**, ⋮). **+ Cadastrar processo**.
- Modal **Cadastrar processo**: Número (CNJ), Pasta vinculada, Tribunal, Vara/comarca, Fase atual, **Nosso polo** (Autor/requerente · Réu/requerido · Terceiro interessado), Valor da causa, Data de distribuição.

### 8. Nova atividade  *(o formulário-chave)*
- "← Voltar para a agenda" + título + ajuda contextual.
- **Abas de tipo**: Prazo · Compromisso · Monitoramento.
- Comum: **Pasta vinculada** · **Nível da atividade** = "Geral da pasta (sem processo)" **ou** um processo específico (+ ajuda) — é o "processo geral" exposto de forma clara.
- **Prazo**: Tribunal (calendário de feriados) — *"Sem tribunal (só sábados e domingos)"* · Tipo de prazo · **Data da disponibilização** · **Prazo em dobro** (*"Litisconsortes com procuradores distintos, Defensoria, MP"*).
- **Compromisso**: Tipo · Data · Horário · Duração (min) · Local · Recorrência.
- **Monitoramento**: Tipo · Alvo do monitoramento · Data da verificação (opcional) · Recorrência.
- **Painel "Memória de cálculo"** (fundo escuro): selo · **Prazo fatal** (data + dia da semana) · **Prazo interno** (data + dia) · aviso de feriados · **"Como chegamos nessas datas"** (passos numerados) · **Base legal** (citação).
- **"Ajustar manualmente"**: Prazo fatal · Prazo interno · **Motivo do ajuste (obrigatório)** — *"fica registrado no histórico do prazo com autor, data e motivo."*
- **Prévia**: "Entrada na agenda" + 2–3 linhas.
- Nota: *"Compromissos e monitoramentos não têm memória de cálculo: a data é definida por você, não apurada em dias úteis."*
- Botões: **Salvar prazo** / (cta variável) / Cancelar.

### 9. Detalhe da atividade  (painel lateral)
- Cabeçalho: `{código} · {cliente} · {nível}` + `{tipo} — {pasta}` + fechar.
- Bloco de datas (rótulo + valor + rótulo secundário + valor secundário) + **Situação**.
- **Memória de cálculo** (selo + passos + base legal).
- Bloco do tipo (título + detalhes extras).
- **Anotações** — *"Acompanhamento livre da equipe. Não altera datas nem o cálculo."* (iniciais, autor·quando, texto) + "Adicionar anotação".
- **Histórico de ajustes** — ação, `quando · quem`, "motivo".
- Botão **Marcar como cumprido**.

### 10. Modais
- **Marcar como cumprido?** — *"{tipo} da pasta {pasta}, com prazo fatal em {data}, sairá da lista de pendências."* → "Sim, cumprido" / "Voltar".
- **Editar prazo** · **Excluir este prazo?** (confirmação).

## Divergências úteis entre protótipo e plano (decidir)

| Ponto | Protótipo | Plano atual |
|---|---|---|
| Estado "dentro da margem" | **"Hora de fazer"** | "Dentro da margem" — adotar o do protótipo |
| Status "Adiado" | existe | não existe no enum — decidir |
| Telefone/e-mail do cliente | no cadastro rápido | Etapa 2 — protótipo antecipa (ok, é barato) |
| Processo: campo | **"Fase"** | "situacao" — renomear para `fase` |
| Polo do cliente | **"Nosso polo"** (autor/réu/terceiro) | `polo_cliente` ativo/passivo — alinhar rótulo e incluir "terceiro" |
| Fluxo guiado | cliente → "salvar e criar pasta" → "salvar e cadastrar processo" | não especificado — adotar |
