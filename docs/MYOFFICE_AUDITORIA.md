# MYOFFICE — AUDITORIA TÉCNICA / ARQUEOLOGIA COMPLETA

- **Autor do projeto:** Jefferson (GitHub `JJ-Silva`) — advogado + dev solo, home office. Stack de origem: VBA/Excel.
- **Data da auditoria:** 2026-08-28
- **Fontes analisadas:**
  1. 9 repositórios GitHub da conta `JJ-Silva` (clonados em `C:\Users\jefer\Documents\MyOffice-Auditoria`), exceto `financasclaras`.
  2. `D:\BACKUP DO PC - 20.06.2026\Desktop\MyOffice Ver0.0\` (VB.NET + documentos de arquitetura + DDL).
  3. `D:\JJ-Silva\MyOffice-CORE\` (clone local do CORE, 1 commit atrás do GitHub).
  4. `D:\3. PROGAMACAO\` — **arquivo-mãe**: ~25 pastas MyOffice*, 3 PDFs-guia gerados por IA, 6 docs de arquitetura em Markdown, o utilitário `BcryptHashGenerator`.
  5. `D:\Jefferson\4. EXCEL\` — arquivo VBA/Excel (origem real do projeto, desde 2021).
- **Convenção:** **[FATO]** = extraído direto de repo/commit/build/arquivo. **[INTERPRETAÇÃO]** = leitura minha. **"sem registro claro"** = sem evidência.
- **Limitação da máquina:** só há .NET SDK 10 (sem runtime 8). `dotnet build` funciona; testes rodam com roll-forward para o .NET 10. Projetos VB.NET/.NET Framework e planilhas `.xlsm` não foram compilados/executados.

---

## 1. MAPA DE REPOSITÓRIOS E PASTAS

### 1.1 Era VBA/Excel (`D:\Jefferson\4. EXCEL\`) — a origem **[FATO]**

| Pasta | Conteúdo | Datas | Veredito |
|---|---|---|---|
| `4. PROCESSOS JUDICIAIS\CONPJ - Ver 1` | "CONPJ" (Controle de Processos Judiciais), **18 planilhas** `.xlsm` de `Ver 0.0 (inicio de projeto)` a `Ver 1.6` — nomes narram tudo: "codigo para registra", "limpar os bancos e primeiro registro", "Reformulando o formulario" ×6 | **mai–?/2021** (Ver 0.0 = 14/05/2021) | **Tentativa séria** — primeira encarnação do MyOffice |
| `4. PROCESSOS JUDICIAIS\CONPJ - Ver 2` | 8 planilhas, "Reformulando a ideia inicial", "Importando codigos uteis da versão anterior", "codigos da folha da agenda", "teste form sem borda" | **jul/2021+** | Continuação do CONPJ |
| `7. CONTROLE DE PJ - PETI`, `9. controle de PJ PETI 2.0`, `8. controle de PJ Lucas` | Variações do controle de processos (com bancos `.accdb`) | ~2022–2024 | Ramos paralelos |
| `12. Gestao Escritorio Advocacia` | — | — | Ramo paralelo |
| `14. Google Drive\Api-GoogleDrive_for_VBA` | Biblioteca de integração Google Drive para VBA (+ `credentials`) | — | Peça de infra (regra "Word→modelos / PDF→cliente") |
| `21. MyOffice VBA` | **`My Ofice - Ver. 0.0 (montando DB)`**, **`Ver. 0.1 (Cadastro de pasta)`**, **`Ver. 0.2 (Agenda)`** | **set/2025** | **Regressão** — voltou ao VBA depois do C# travar |

**[FATO]** O backup `D:\BackUp - 09-01-2022...zip` e o `CONPJ - Ver 0.0` de 14/05/2021 estabelecem que o projeto começou como **planilha VBA em 2021**, sob o nome "CONPJ".
**[INTERPRETAÇÃO]** O nome "MyOffice / My Ofice" aparece só na fase `21. MyOffice VBA`; antes disso o projeto se chamava CONPJ.

### 1.2 Era C# / VB.NET local (`D:\3. PROGAMACAO\`) — não está no GitHub **[FATO]**

| Pasta | Stack | Data | O que é | Veredito |
|---|---|---|---|---|
| `C#\Formulario` | C# | 03/dez/2024 | 1º experimento C# | Experimento pontual |
| `C#\Teste_Painel (painel lateral no excel)` | C# / VSTO(?) | 24/dez/2024 | Tentativa de painel lateral dentro do Excel | Experimento pontual |
| `C#\JJ Adv (Agenda)` | C# | 31/dez/2024 | App de agenda | Experimento pontual |
| `C#\MyOffice_Advocacia (teste com windowsForm)` | VB.NET WinForms | 07/jan/2025 | = repo GitHub `MyOffice_Advocacia` | (ver 1.4) |
| **`C#\MyOffice 2.0 (formulário de login em WPF)`** | **C# WPF + 3 camadas + DTO** | **26/jan/2025** | **O "MyOffice 2.0" que faltava** — `1-UI` (WPF, `Login.xaml`, ViewModel) + `BLL` (`IClienteService`) + `DAL` (`IClienteRepository`) + `DTO` (`ClienteDto`). Tem `Metas.txt` (checklist) e `Comando IA.txt`. Não é git. | **Tentativa séria** — repositórios são stubs (`Add()` só retorna `true`) |
| `MyOffice` / `MyOffice 0` / `MyOffice - Copia` | C# | mai/2025 | Cópias de trabalho do repo GitHub `MyOffice` (em commits diferentes); `MyOffice - Copia` traz o PDF de refatoração + `diagrama do banco de dados.png` | (ver 1.5) |
| `MyOffice - CORE` | C# | jun/2025 | Cópia do repo `MyOffice-Core-Ver.0.1` | (ver 1.5) |
| `MyOffice Core V.0` | C# **Console** | 07/jun/2025 | `MyOffice.Console/Program.cs` — runner console do CORE. Não é git. | Experimento |
| `MyOffice refactoring - Ver. 0.0` | — | 23/ago/2025 | **Pasta vazia** | Restart natimorto |
| `MyOffice.UI.WPF` (standalone) | C# WPF | **20/mar/2026** | Shell WPF só de UI (`App`, `MainWindow`, `Converters`, `Resources/Styles`) — sem Domain/Application | **Restart mais recente, abandonado cedo** |
| `Obsoleto\MyOffice` | C# | mai/2025 | = repo `MyOffice-Modular` (arquivo `MyOffice 5.sln`; PDF "Criar Solução do Zero"; `src/`+`tests/`) | Marcado "Obsoleto" pelo próprio autor |
| `Obsoleto\MyOffice CORE` | C# | mai/2025 | Cópia obsoleta do CORE | Obsoleto |
| `BcryptHashGenerator` | C# | 19/mai/2025 | Utilitário para gerar hash BCrypt (provavelmente p/ semear `tb_user`) | Ferramenta de apoio |
| `myoffice modulavel` | 6 docs `.md` | 23–24/mai/2025 | Design de arquitetura de plugins (ver Seção 4) | Documentação |
| `Curso de VBA` | vídeos `.mp4` | — | Material de estudo (VBA na prática, integração Excel+Word) | — |

### 1.3 Repositórios GitHub

| # | Repositório | Stack | Atividade (commits) | Commits | Compila hoje? | Veredito |
|---|---|---|---|---|---|---|
| 1 | `Escritorio_de_Advocacia` | VB.NET WinForms / Access | 06/jan/2025 (1 dia) | 2 | não avaliável (VB/.NET Framework) | Experimento pontual — trocado no mesmo dia |
| 2 | `MyOffice_Advocacia` | VB.NET WinForms / Access→MySQL | 06→17/jan/2025 | 17 | idem | **1ª tentativa séria no GitHub** (aprendizado por videoaula) |
| 3 | `MyOffice-MVP` | C# Console / .NET 8 | 07/abr + 03/mai/2025 | 3 | ✅ compila | Experimento de modelagem |
| 4 | `MyOffice-3.0` | C# WPF/MVVM / MySQL | 09→11/mai/2025 | 11 | ✅ compila | **Tentativa séria** — 1º GUI real, login MySQL funcionando |
| 5 | `MyOffice-4.0` | C# WPF / Clean Arch | 17/mai/2025 (1 dia) | 3 | ❌ **build falha** | Experimento pontual — reiniciado no dia seguinte |
| 6 | `MyOffice` | C# WPF / Clean Arch + Plugins | 18→27/mai/2025 | 27 (23 master + 4 na branch) | ❌ **build falha** (master e branch) | **A mais ambiciosa** — melhor cobertura funcional, morreu quebrada no meio da migração p/ plugins |
| 7 | `MyOffice-Modular` | C# Clean Arch (namespaces `.Core`) | 24/mai/2025 | 2 (+1 na branch) | ❌ **build falha** | Experimento — restart "seguindo o PDF", quase vazio |
| 8 | `MyOffice-CORE` | C# WPF / Clean Arch | 27→30/mai/2025 | 13 | ✅ **compila + 16/16 testes passam** | **Tentativa séria mais madura** — domínio rico, único com testes verdes |
| 9 | `MyOffice-Core-Ver.0.1` | C# WPF / Clean Arch | 08/jun/2025 | 2 | ✅ compila | Checkpoint congelado do CORE (sem os testes) |

**[FATO]** Nenhum repo GitHub tem README/LICENSE/CHANGELOG/tags/releases. Nenhum usa Issues/Projects.

---

## 2. LINHA DO TEMPO CONSOLIDADA

**2021-05 a 2021-07 — CONPJ (Excel/VBA)** **[FATO]**
`CONPJ - Ver 0.0 (inicio de projeto).xlsx` (14/05/2021) → 18 versões até `Ver 1.6`. Depois `CONPJ - Ver 2` (8 versões, "Reformulando a ideia inicial"). Já tinha: cadastro, "folha da agenda", formulários VBA.

**2022–2024 — Ferramentas Excel/VBA paralelas** **[FATO]**
`CONTROLE DE PJ - PETI`, `controle de PJ PETI 2.0`, `controle de PJ Lucas`, `Gestao Escritorio Advocacia`, integração Google Drive p/ VBA. Bancos em `.accdb`.

**2024-12 — Primeiros passos em C#** **[FATO]**
`Formulario` (03/dez), `Teste_Painel (painel lateral no excel)` (24/dez), `JJ Adv (Agenda)` (31/dez).

**2025-01 — Fase VB.NET + planejamento** **[FATO]**
- 03–05/jan: projetos `BLL`/`DAL`/`Entities` VB.NET criados localmente (`MyOffice Ver0.0`).
- 06/jan: repos GitHub `Escritorio_de_Advocacia` (2 commits) e `MyOffice_Advocacia` (início).
- 07/jan **00:39**: `Modelagem DB.mwb` + **`Script SQL Cria banco de dados.sql`** (Forward Engineering, banco `db_jsadv`, 17 tabelas).
- 07/jan: `MyOffice_Advocacia` — "Classe Conexao testada", "MySql Connector", App.Config, botão de teste de conexão.
- 08–17/jan: `MyOffice_Advocacia` — classes de domínio (`Cls_Pasta`/`ProcessoJudicial`/`ProcessoAdm`/`Atividades`), interfaces `IPastaRaiz`/`IProcesso`, `FrmCadastroCliente`, **último commit "Criando UserControls para o formulário Dinamico"**.
- **19/jan**: `Você está no caminho certo ao usar a arquitetura em 3 camadas.docx` (export de conversa com IA) + `arquitetura softWarw.txt` (estrutura DAL/BLL/UI com 14 repositórios + interfaces + 14 models + 14 services; regra de negócio "Word→pasta de modelos, PDF→pasta do cliente"; "factory method e injeção de dependência").
- **26/jan**: `MyOffice 2.0 (formulário de login em WPF)` — C# WPF + BLL/DAL/DTO + `Login.xaml`; `Metas.txt`.

**GAP 17/jan → 07/abr (~2,5 meses)** sem commits (fev/2025: ajustes no `.mwb`).

**2025-04/05 — Era GitHub C#** **[FATO]**
- 07/abr + 03/mai: `MyOffice-MVP` (console, DI + Factories).
- 09–11/mai: `MyOffice-3.0` (WPF/MVVM + MySQL ADO.NET; login funcionando; "Painel principal quase concluido").
- 17/mai: `MyOffice-4.0` (Clean Arch; **não compila**; abandonado em <24h).
- 18–26/mai: `MyOffice` — "Fase 2..5"; controles customizados; navegação por região/frame; **"Teste de login Corrigido e funcionando"** (22/mai); **suíte FlaUI de testes de UI**; 24/mai o agente `google-labs-jules[bot]` inicia a migração p/ **plugins**; 26/mai "Parte do Domain" cola as entidades do `Modular` e **quebra o build**.
- 19–24/mai: **3 PDFs-guia gerados por IA** (ver Seção 4) + `BcryptHashGenerator` + 6 `.md` de arquitetura de plugins.
- 24/mai: `MyOffice-Modular` (restart "seguindo o PDF Criar Solução do Zero").
- 27/mai: branch `refactor/plugin-architecture-audit` do `MyOffice` — migração de plugins marcada **100% concluída** no log, **mas não compila**, nunca merjeada. **No mesmo dia** começa o `MyOffice-CORE`.
- 27–30/mai: `MyOffice-CORE` — remove login de propósito, domínio jurídico rico, `jules` conserta erros de compilação e adiciona **16 testes** (todos verdes).

**2025-06** **[FATO]**
- 07/jun: `MyOffice Core V.0` (console runner do CORE, local).
- 08/jun: `MyOffice-Core-Ver.0.1` (checkpoint congelado do CORE). **Último commit em qualquer repo GitHub.**

**2025-08** — `MyOffice refactoring - Ver. 0.0`: **pasta vazia** criada em 23/ago. **[FATO]**

**2025-09 — Regressão para VBA** **[FATO]**
`21. MyOffice VBA`: `My Ofice - Ver. 0.0 (montando DB)` (13/set) → `Ver. 0.1 (Cadastro de pasta)` (24/set) → `Ver. 0.2 (Agenda)` (24/set). O ciclo "montar DB → cadastro de pasta → agenda" repetido, agora em Excel/VBA.

**2026-03** — `MyOffice.UI.WPF` standalone: shell WPF só de UI, criado em 20/mar/2026, abandonado cedo. **[FATO] Artefato MyOffice mais recente.**

**GAP 03/2026 → hoje (2026-08)** — sem novos artefatos.

### Resumo do arco **[INTERPRETAÇÃO]**
CONPJ/VBA (2021) → controles Excel paralelos (2022-24) → 1ª virada para C#/VB.NET (dez/24–jan/25) → planejamento formal com IA (jan/25) → 6 tentativas C# no GitHub em ~7 semanas (abr–jun/25) → **regressão ao VBA** (set/25) → mais um restart WPF (mar/26). São **~5 anos** e pelo menos **15 reinícios** identificáveis.

---

## 3. STACK TÉCNICO POR TENTATIVA

### CONPJ / MyOffice VBA **[FATO]**
Excel `.xlsm` + VBA + UserForms; bancos em Access `.accdb`; integração Google Drive via `Api-GoogleDrive_for_VBA`. Conteúdo do código VBA **não extraído** nesta auditoria.

### `Escritorio_de_Advocacia` / `MyOffice_Advocacia` / `MyOffice Ver0.0` **[FATO]**
VB.NET, WinForms, .NET Framework. Solução `BLL`/`DAL`/`Entities`(+`Interfaces`)/`User_Interface`. `DAL/Cls_Conexao.vb` usa **OleDb** (`Microsoft.ACE.OLEDB.12.0` → `G:\Meu Drive\00. My Ofice\1. - GESTÃO\DATA_BASE\DB_JSAdv.accdb`); `Cls_Metodos : Cls_Conexao` com `INSERT ... ; SELECT Max(ID)`. `Cls_Atividades`: **composição** (comentário "COMPOSIÇÃO E VEZ DE HERANÇA"), 2 construtores (por `IPastaRaiz` ou por `IProcesso`). `MyOffice_Advocacia` migra a connection string para MySQL Connector.

### `MyOffice 2.0` **[FATO]**
C#, `net8.0`, WPF. Projetos `1-UI` (WPF: `App`, `MainWindow`, `View/Login.xaml`, `ViewModel`), `BLL` (`IClienteService`/`ClienteService`), `DAL` (`IClienteRepository`/`ClienteRepository`), `DTO` (`ClienteDto`). Repositórios são **stubs** (`Add()` → `return true`, comentário "logica para persistencia no banco de dados"). Namespace `Entitie.Interfaces` (grafia inconsistente).

### `MyOffice-MVP` **[FATO]**
C# Console `net8.0`; `Microsoft.Extensions.DependencyInjection`; Factory por entidade; **sem banco**.

### `MyOffice-3.0` **[FATO]**
C# WPF/MVVM `net8.0-windows`; `MySql.Data 9.3.0`, `FontAwesome.Sharp 6.6.0`, `System.Data.SqlClient` (resíduo); **ADO.NET puro** (`MySqlCommand`); `UserRepository` (`AuthenticateUser`, `GetbyUsername` reais; CRUD = `NotImplementedException`); `App.config` `ConBd`.

### `MyOffice-4.0` **[FATO]**
C# WPF `net8.0`; Clean Arch; `appsettings.json`; **sem driver de banco**; **build falha** (`CommandManager` em projeto sem WPF; evento `CanExecuteChanged`).

### `MyOffice` **[FATO]**
C# Clean Arch + Plugins; 12 projetos (5 camadas + `Tests` + `Common/MyOffice.Common.Plugins` + `Plugins/UserManagement/*`×4). Pacotes: `BCrypt.Net-Next 4.0.3`, `MySql.Data 9.3.0` **+** `MySqlConnector 2.4.0` (dois drivers), `AutoMapper 14`, `FluentValidation 12`, `xunit`+`Moq`+`FluentAssertions`, **`SeraphSecure.FlaUI.Core/UIA3`** (automação de UI). Persistência própria (`Persistence/Context/DatabaseContext.cs` + `UnitOfWork.cs`, **não EF**). Plugin: `IPlugin`/`IExtensionPoint`/`IMenuRegistry`/`IViewRegistry` + `MyOffice.Host/PluginManager` (previsto no PDF, `Assembly.LoadFrom`). ~14 000 LOC. 1 projeto `net9.0-windows` solto. **Não compila.**

### `MyOffice-Modular` **[FATO]**
C# Clean Arch, namespaces `MyOffice.Core.*`; `Domain` com `Entities`/`Enums`/`Exceptions`/`ValueObjects`; **não compila** (enums `Priority`/`ActivityStatus` ausentes, acessibilidade `Process`).

### `MyOffice-CORE` / `MyOffice-Core-Ver.0.1` **[FATO]**
C# WPF Clean Arch `net8.0`/`net8.0-windows`, 7 projetos (CORE) / 5 (Ver.0.1, sem testes). **`Infrastructure` sem driver de banco**; `BaseRepository<T>` = `ConcurrentDictionary` em memória + `DataSeeder`; `Bootstrapper` + DI + `App.xaml.cs` com tratamento global de exceções; `appsettings.json` declara `"Provider":"MySql"` mas **nada consome**; **MSTest**. LOC (CORE): Domain 3 567 / Application 834 / Infrastructure 536 / Presentation 437 / UI.WPF 5 728 / testes 325. **Compila; 16/16 testes passam.**

### `MyOffice.UI.WPF` (standalone, mar/2026) **[FATO]**
C# WPF, projeto único: `App`, `MainWindow`, `Converters` (`BooleanConverters`, `StringToVisibilityConverter`, `HeightToCornerRadiusConverter`, `MiscConverters`), `Resources/Styles`. Sem lógica de negócio.

### Inventário de pacotes (todos os `.csproj`) **[FATO]**
`MySql.Data 9.3.0` · `MySqlConnector 2.4.0` · `BCrypt.Net-Next 4.0.3` · `AutoMapper 14.0.0` · `FluentValidation 12.0.0` · `FontAwesome.Sharp 6.6.0` (constante em toda versão WPF) · `Microsoft.Extensions.DependencyInjection/Configuration` (8.x e 9.x misturados) · `System.Data.SqlClient 4.9.0` (resíduo) · `xunit 2.6.6` + `Moq 4.20.70` + `FluentAssertions 6.12.0` (MyOffice) · `MSTest 3.0.2` (CORE) · `SeraphSecure.FlaUI.Core/UIA3 5.0.0.1` (MyOffice). Frameworks: 31× `net8.0`, 10× `net8.0-windows`, 1× `net9.0-windows`.

---

## 4. DECISÕES DE ARQUITETURA IDENTIFICADAS

### 4.1 Documentos de referência (todos gerados por IA)

**a) `Você está no caminho certo ao usar a arquitetura em 3 camadas.docx`** (19/jan/2025) **[FATO]**
Export de conversa com IA validando a arquitetura em 3 camadas para a fase VB.NET.

**b) `arquitetura softWarw.txt`** (19/jan/2025) **[FATO]**
Estrutura-alvo detalhada: `DAL/Repositorios` (14) + `DAL/Interfaces` (14) → `BLL/Model` (14) + `BLL/Servicos` (14) + `BLL/Interfaces` (14) → `UI/ViewModels` + `UI/Views`. Decisões explícitas: **interfaces para trocar BLL/DAL sem afetar a UI**; **factory method + injeção de dependência**; **hash+salt** (e Google auth "no futuro"). **Regra de negócio:** *"OS DOCUMENTOS EM WORD SÃO DIRECIONADOS PARA A PASTA DE MODELOS E OS DOCUMENTOS EM PDF SÃO DIRECIONADOS À PASTA DO CLIENTE."* Entidades: Atividade, Cliente, ConfContagem, Email, Endereco, **Equipe**, Observacao, Pasta, PoloOposto, ProcessoAdministrativo, ProcessoJudicial, Telefone, Tratamento, User.

**c) `MyOffice - Guia Completo para Criar Solução do Zero.pdf`** (em `MyOffice-Modular` e `Obsoleto/MyOffice`) **[FATO]**
Passo a passo (cliques no VS) para montar a solução Clean Architecture do zero. Decisões: `src/Core/{Domain,Application,Infrastructure}` + `src/Presentation/{Core.Presentation,UI.WPF}` + `src/Plugins/ (futuro)` + `tests/` (4 projetos); **SEM Entity Framework** (dito 2×); `AutoMapper` + `FluentValidation` (Application); `MySql.Data` + `BCrypt.Net-Next` (Infrastructure); **xUnit** (o CORE real usou MSTest). Próximo passo: "Domain com Folder, Process e Activity".

**d) `MyOffice - Guia Completo de Refatoração e Desenvolvimento.pdf`** (24/mai/2025, em `D:\3. PROGAMACAO` e `MyOffice - Copia`) **[FATO]**
Plano de 7 fases (≈2 semanas) para **converter o `MyOffice` existente em arquitetura de plugins**: Backup → Estrutura de Plugins (`Common`/`Plugins`/`Host`) → Mover código de usuário para `Plugin.UserManagement` (4 camadas) → Desenvolver o Núcleo → `PluginManager` (`Assembly.LoadFrom` + reflection) → Testes → Deploy. **Fornece o template exato do `REFACTORING_LOG.md`** que aparece no repo, o código de `IPlugin`/`IExtensionPoint`/`IMenuRegistry`/`IViewRegistry`, e as entidades `Folder`/`Process`(enum `ProcessType`: Main/Judicial/Administrative)/`Activity`(enums `ActivityType`/`Priority`/`ActivityStatus`). **É a origem do tipo `Activity` e dos enums que depois quebraram `Modular` e `MyOffice`.** Objetivo declarado: núcleo roda sem login; usuários viram plugin opcional.

**e) `myoffice modulavel\*.md`** (23–24/mai/2025) — 6 documentos **[FATO]**
`myoffice_plugin_architecture.md` (+`(1)`), `plugin_infrastructure_framework.md` ("infraestrutura de extensibilidade para QUALQUER tipo de plugin"), `plugin_security_framework.md` ("vetores de ataque" de plugins), `myoffice_core_implementation_plan.md` ("análise do modelo de dados atual"), `multiplatform_plugin_migration.md` (**migrar plugins WPF → web/mobile mantendo a arquitetura**). Visão: núcleo minimalista + plugins opcionais.

### 4.2 O modelo de dados (`db_jsadv`) **[FATO]**

**DDL real** (`Script SQL Cria banco de dados.sql`, 07/jan/2025) — 17 tabelas:
`TB_Cliente` · `TB_Cliente_Email` · `TB_Cliente_Telefone` (com flag `WathsApp`) · `TB_Cliente_Endereco` + `HAS_Cliente_Endereco` (N:N) · `TB_Pasta` (Nome, Objetivo, Objeto) + `HAS_Pasta_Cliente` (N:N) · `TB_Tratamento` · `TB_Equipe` + `HAS_User_Equipe` (N:N) · `TB_Processo_Judicial` (Justica, Vara, Ação, `Cliente_Polo_Ativo`) · `TB_Processo_Administrativo` (Num) · `TB_Atividade` (Data_Inicio, Dias, **Prazo**, **Prazo_Fatal**, Data_Conclusao, FKs p/ Pasta + Processo Judicial *ou* Adm + Tratamento + Equipe + Config_Contagem) · `TB_User` (`Hash_Senha` com UNIQUE) · `TB_Polo_Oposto` · `TB_Observacao` (→ Atividade) · `TB_Configuracao_Contagem` (`Dias_Uteis`, `Prazo_Dobrado`, `Excluir_Feriados`).

**Diagrama v2** (`diagrama do banco de dados.png`, ~mai/2025): evolui para `tb_processo` genérica (Numero, DataInicio, DataFim, Status, ID_Pasta) + especializações `tb_processo_judicial` / `tb_processoadministrativo` (agora com OrgaoJulgador, Secretaria, Tipo, PoloCliente); `tb_user` ganha `Created_At`/`Updated_At`/`FullName`/`Email`.

**[INTERPRETAÇÃO]** Este modelo relacional é o artefato mais estável e valioso do projeto: sobrevive de jan/2025 (VB.NET) até o domínio C# do `MyOffice-CORE`, mapeando quase 1:1 nas entidades — exceto **`TB_Equipe`** (equipe/staff), que está no DDL e no `arquitetura softWarw.txt` desde o início mas **nunca virou código** em nenhuma tentativa.

### 4.3 Decisões por tentativa (resumo)
- **VB.NET / MyOffice 2.0**: 3 camadas + interfaces + factory + DI; Access → MySQL; hash+salt.
- **MyOffice-3.0**: WPF/MVVM; ADO.NET puro (sem ORM); login por consulta a `tb_user`.
- **MyOffice**: Clean Architecture em fases; Presentation separada da UI.WPF; navegação própria por região/frame; BCrypt; persistência própria (não EF); **migração tardia para plugins** conduzida por IA.
- **MyOffice-CORE**: **remoção deliberada do login** (`App.xaml.cs`: *"Sistema iniciará diretamente na tela principal (sem login)"*; `BindablePasswordBox` removido — "BLOCO REMOVIDO"); **persistência adiada** (repos in-memory + `DataSeeder`); foco no domínio jurídico (contagem de prazos, parsing CNJ); MSTest.

---

## 5. O QUE FUNCIONOU

| Funcionalidade | Onde (repo / caminho) | Evidência | Confiança |
|---|---|---|---|
| **Domínio jurídico rico — compila e passa nos testes** | `MyOffice-CORE/MyOffice.Domain/` (3 567 LOC) e `MyOffice-Core-Ver.0.1` | `dotnet build` limpo; **7/7** em `Domain.Tests` (`ActivityBaseTests`, `ActivityRecurrenceTests`) | **Alta** (verificado) |
| **Camada Presentation (comandos assíncronos) — testada** | `MyOffice-CORE/MyOffice.Presentation/` | **9/9** em `Presentation.Tests` (`AsyncRelayCommandTests`) | **Alta** (verificado) |
| **Parsing de número CNJ** | `MyOffice-CORE/.../Entities/ProcessJudicial.cs` (`ExtractCNJInfo`) | segmento (1=STF…8=Est.), tribunal, origem, ano, sequencial; compila | Média-alta |
| **Contagem de prazos** | `MyOffice-CORE/.../Entities/ConfiguracaoContagem.cs` | dias úteis, prazo dobrado (fora da comarca), feriados, sábado útil; TODOs honestos (tabela de feriados, feriados móveis) | Média-alta |
| **Shell WPF do CORE sobe sem login** (janela principal, navegação, telas de lista Folder/Process/Activity/Agenda) | `MyOffice-CORE/MyOffice.UI.WPF/` (`Bootstrapper`, `MainWindow`, ViewModels) | `dotnet build` limpo (WPF incluída); `_bootstrapper.Run()` no `OnStartup` | Média (compila; execução visual não testada aqui) |
| **Tratamento global de exceções (WPF)** | `MyOffice-CORE` / `Ver.0.1` — `App.xaml.cs` | handlers `UnhandledException`/`DispatcherUnhandledException`/`UnobservedTaskException` | Alta |
| **Login + navegação + CRUD de usuário (WPF)** | `MyOffice` — `MyOffice.UI.WPF` + `MyOffice.Presentation` | commits "Teste de login ... funcionando" / "Navegação ... corrigida"; **suíte FlaUI**: `Login_WithValid/InvalidCredentials`, `NavigateToUser/Settings/Dashboard`, `CreateUser`, `EditUser` | Média-alta (testes existem; repo não compila hoje) |
| **Testes de integração Application ↔ MySQL** | `MyOffice/MyOffice.Tests/{Application,Integration}` | `AuthenticationService_Login_WithValidCredentials_ShouldSucceed`, `UserService_CreateAndGetUser` (dados reais no banco) | Média |
| **Controles WPF customizados** | `MyOffice/.../Controls` (`BindablePasswordBox`, `LoadingSpinner`, `NotificationControl`, `MessageBoxControl`); `MyOffice-CORE/.../Controls` (`ToastNotification`, `CircularProgressSpinner`) | commits "+ TESTE DOS CONTROLES"; compilam no CORE | Média-alta |
| **Login MySQL (ADO.NET) — compila** | `MyOffice-3.0/UI/Repositories/UserRepository.cs` | `dotnet build` limpo; queries parametrizadas contra `tb_user` | Alta (CRUD = `NotImplementedException`) |
| **DI + Factories (Console) — compila** | `MyOffice-MVP/MyOffice MVP/Program.cs` + `BLL/Factories` | `dotnet build` limpo | Média-alta |
| **Cadastro de cliente + teste de conexão (VB.NET)** | `MyOffice_Advocacia` / `MyOffice Ver0.0` (`DAL/Cls_Metodos.vb`) | `INSERT ... SELECT Max(ID)` completo; commit "Classe Conexao ... testada" | Média |
| **DDL completo do banco** | `MyOffice Ver0.0/Script SQL Cria banco de dados.sql` | 17 tabelas com tipos, FKs, índices únicos — executável | Alta (como artefato) |
| **Modelo ER (2 versões)** | `ER Model.mwb` (`MyOffice-MVP`), `Modelagem DB.mwb` (`MyOffice Ver0.0`), `diagrama do banco de dados.png` | coerentes entre si | Alta |
| **CONPJ / MyOffice VBA (uso real?)** | `D:\Jefferson\4. EXCEL\...\CONPJ`, `21. MyOffice VBA` | nomes de versão indicam cadastro + agenda + registro funcionando ("primeiro registro", "codigos da folha da agenda") | Baixa-média (não abri as planilhas) |

---

## 6. O QUE NÃO FUNCIONOU / FOI ABANDONADO

- **`Escritorio_de_Advocacia`** — 2 commits; `Form1.vb` referencia BLL/DAL/Entities não commitados no repo (existem em `MyOffice Ver0.0`). Substituído no mesmo dia. **[FATO]**
- **`MyOffice_Advocacia`** — último commit 17/jan/2025; sem persistência completa. Stack VB.NET abandonada. **[FATO]**
- **`MyOffice 2.0`** — repositórios são stubs (`return true`); nunca conectou banco. **[FATO]**
- **`MyOffice-MVP`** — Processos/Pastas/Configurações = "não implementado". **[FATO]**
- **`MyOffice-3.0`** — CRUD de usuário = `NotImplementedException`; "quase concluido". **[FATO]**
- **`MyOffice-4.0`** — **`dotnet build` falha**; 3 commits; recomeço no dia seguinte. **[FATO]**
- **`MyOffice`** — **`master` e a branch `refactor/plugin-architecture-audit` não compilam** (tipo `Activity` inexistente — herdado do `Modular`; plugin sem referência a `MyOffice.Domain`; `ValueObjects` usado como tipo). O `REFACTORING_LOG.md` da branch marca a migração como **100% concluída** e apaga ~1 800 linhas de código duplicado, mas o resultado não compila e **nunca foi merjeado**. Pastas `_OLD_UserCode` no `master`. Projeto `net9.0` solto. **É o beco sem saída central.** **[FATO] + [INTERPRETAÇÃO]**
- **`MyOffice-Modular`** — `master` = project files + domínio que **não compila**; reestruturação só na branch `feature/...` (nunca merjeada), quase vazia. Marcado `Obsoleto` pelo autor. **[FATO]**
- **`MyOffice-CORE`** — **sem camada de persistência**: `BaseRepository<T>` = `ConcurrentDictionary` em memória (ID por reflection, corrigido pelo `jules` por problema de threading); `appsettings.json` declara MySQL mas nada consome; `jules` teve de abrir 2 PRs só de correção de compilação. `RemainingRepositories.cs`, pasta `TESTE/Views`, `ServicesTestViewModel` — resíduos. Parou **antes** de ligar banco e de fazer CRUD sobre o domínio. **[FATO] + [INTERPRETAÇÃO]**
- **`MyOffice-Core-Ver.0.1`** — 2 commits, nada depois; traz **menos** que o CORE. **[FATO]**
- **`MyOffice Core V.0`** (console) — experimento local sem continuidade. **[FATO]**
- **`MyOffice refactoring - Ver. 0.0`** — **pasta vazia** (ago/2025). **[FATO]**
- **`21. MyOffice VBA`** (set/2025) — 3 planilhas, para em "Agenda"; sem continuidade registrada. **[FATO]**
- **`MyOffice.UI.WPF`** standalone (mar/2026) — só shell de UI, sem domínio; abandonado cedo. **[FATO]**

### Padrão transversal **[INTERPRETAÇÃO]**
1. **Reinício em vez de evolução:** a cada refino de arquitetura (camadas → Clean Arch → plugins → modular → "do zero" de novo), cria-se um repo/pasta novo. ~15 reinícios em 5 anos.
2. **Arquitetura à frente da entrega:** o esforço de scaffolding/refatoração (3 PDFs-guia, 6 docs de plugins, migrações) consumiu o tempo que faria as features. Os dois pontos onde toda tentativa trava são **(a) persistência real** e **(b) telas de CRUD ligadas ao domínio**.
3. **IA como acelerador ambíguo:** o agente `jules` estabilizou o `MyOffice-CORE` (único verde) mas também conduziu a migração de plugins que matou o `MyOffice`; os PDFs deram plano, mas o plano de plugins era grande demais.
4. **Regressão sob pressão:** quando o C# travou (jun/2025), a resposta foi voltar ao VBA (set/2025) — a zona de conforto.
5. Nenhum commit/README/doc explica o **motivo** de cada parada.

---

## 7. GAPS DE INFORMAÇÃO

**Resolvidos nesta auditoria (não são mais gaps):**
- ✅ Os 3 PDFs-guia — lidos e resumidos (Seção 4.1).
- ✅ Modelos ER e **DDL completo** — extraídos (Seção 4.2).
- ✅ "MyOffice 1.0 / 2.0" — **1.0 = CONPJ/VBA (2021)**; **2.0 = `C#\MyOffice 2.0 (formulário de login em WPF)` (jan/2025)**.
- ✅ Fase pré-GitHub — recuperada (`MyOffice Ver0.0`, `D:\3. PROGAMACAO\C#`, `D:\Jefferson\4. EXCEL`).
- ✅ Estado de compilação de cada repo C# — verificado.
- ✅ Branch `refactor/plugin-architecture-audit` — examinada.
- ✅ Trabalho pós-GitHub — mapeado (`MyOffice refactoring - Ver. 0.0`, `21. MyOffice VBA`, `MyOffice.UI.WPF` de 2026).

**Gaps que permanecem:**

1. **Conteúdo do código VBA.** As ~26 planilhas `CONPJ*.xlsm` e as 3 `21. MyOffice VBA/*.xlsm` não tiveram o VBA extraído/analisado. Os nomes dos arquivos contam a história, mas o que exatamente funcionava (formulários, queries, lógica de agenda) não foi inspecionado. **Posso extrair o VBA de planilhas específicas se você indicar quais** (ex.: a `Ver. 0.2 (Agenda)` e a `CONPJ Ver 1.6`).

2. **Motivo de cada abandono.** Continua sem registro. Só você sabe se foi tempo, frustração com a arquitetura, dificuldade técnica pontual, ou mudança de prioridade.

3. **Execução real.** Nenhum shell WPF (`MyOffice-CORE`, `MyOffice-3.0`) foi executado graficamente aqui (sem runtime .NET 8; roll-forward só p/ testes headless). Nenhuma planilha VBA foi aberta. Não há screenshot de nada rodando, nem prova de que algum `.exe`/planilha foi usado no dia a dia do escritório.

4. **O banco `db_jsadv` real.** Há o DDL e 2 versões do modelo, mas nenhum dump com dados. O estado real do banco que você usava não é reconstruível.

5. **`MyOffice_Compilado_Versoes.md`** (em `D:\JJ-Silva\MyOffice-CORE`) — documento de auditoria anterior feito por IA **sem acesso ao GitHub**; contém recomendações (Dapper + MySqlConnector, ajustar schema) que **não** fazem parte desta etapa de levantamento, mas registram que já houve uma tentativa de consolidação.

6. **`D:\3. PROGAMACAO\C#\JJ Adv (Agenda)` e `Teste_Painel`** — não abertos em detalhe (experimentos de dez/2024, provavelmente sem código reaproveitável).

---

## Observações transversais (segurança / higiene) **[FATO]**
- Connection string `server=localhost;...;password=20192020;database=db_jsadv` **commitada** em `MyOffice-3.0`, `MyOffice-4.0` e `MyOffice-CORE`. Credenciais Access idem (`MyOffice Ver0.0/App.config`, caminho do Google Drive).
- `MyOffice-3.0` compara senha direto em SQL; só o `MyOffice` usa BCrypt. `TB_User.Hash_Senha` tem índice **UNIQUE** (impede dois usuários com a mesma senha — erro de modelagem).
- `MyOffice` mistura dois drivers MySQL e tem 1 projeto `net9.0` entre dezenas `net8.0`.
- `db_jsadv` ("JS Advocacia") é o nome do banco desde jan/2025; "CONPJ" era o nome do projeto em 2021.

---

## Síntese — o que sobrevive para o reinício

O desenvolvimento do MVP recomeça **do zero em nova stack**. O que se aproveita da história é o **desenho, não o código**:

1. **Modelo de dados** — `Script SQL Cria banco de dados.sql` (17 tabelas) + `diagrama do banco de dados.png` + o modelo de domínio do `MyOffice-CORE` (`Folder`/`Process`/`Activity` com hierarquia, `ConfiguracaoContagem`, parsing CNJ). Coerente e estável desde jan/2025.
2. **Regras de domínio** — contagem de prazo processual, parsing/validação do número CNJ (algoritmo veio do VBA), hierarquia de atividades (`DeadlineActivity` / `AppointmentActivity` / `MonitoringActivity` = prazo / compromisso / monitoramento).
3. **Regra de negócio documentada** — documentos Word → pasta de modelos; PDF → pasta do cliente (via API Google Drive).
4. **Os 3 PDFs-guia e os 6 `.md`** — referência do que **NÃO** refazer (arquitetura de plugins, Clean Architecture em projetos separados).

**Nenhum código (C# / VB.NET / VBA) é reaproveitável** — linguagem e plataforma diferentes. Nenhum repositório é ponto de partida.

**O que a história diz para NÃO repetir (sustentado por evidência):**
- **Arquitetura de plugins** — matou a melhor tentativa; nunca compilou.
- **Novo repo/pasta a cada refino de arquitetura** — ~15 reinícios em 5 anos.
- **Adiar persistência** — o `MyOffice-CORE` fez domínio + testes + shell e travou sem banco.
- **Colar domínio entre projetos sem compilar** (`Modular` → `MyOffice`).
- **Voltar ao VBA quando o C# trava** (`21. MyOffice VBA`, set/2025) — não passou de "Agenda", igual a 2021.
- **Credenciais no controle de versão.**

➡️ **O plano de reinício está em `MYOFFICE_MVP_PLANO.md`** — stack, roadmap, modelo de dados completo, Etapa 1 detalhada, decisões travadas e pendentes.
