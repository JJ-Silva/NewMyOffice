// Catálogo de permissões — Etapa 6.
//
// Uma "permissão" é uma string estável no formato "grupo.acao". Ela fica
// GRAVADA em `rotulo_permissao` e `membro_permissao` — então:
//   - nunca renomear uma chave (só criar nova e migrar);
//   - a mesma lista tem de existir no SQL (função `semear_rotulos_padrao`).
//
// O que cada permissão libera:
//   .ver      → a seção aparece na navegação E o RLS devolve as linhas
//   .criar / .editar / .excluir → as ações de escrita (gate no app)
//   ações específicas (ajustar_prazo, triar, ...) → botões sensíveis
//
// Sem `.ver` de um grupo, o RLS (função `tem_permissao`) não devolve nenhuma
// linha daquele grupo — as ações de escrita ficam inúteis. Por isso o
// `garantirDependencias` força o `.ver` sempre que houver qualquer ação do grupo.

export type Permissao =
  | "clientes.ver"
  | "clientes.criar"
  | "clientes.editar"
  | "clientes.excluir"
  | "pastas.ver"
  | "pastas.criar"
  | "pastas.editar"
  | "pastas.excluir"
  | "processos.ver"
  | "processos.criar"
  | "processos.editar"
  | "processos.excluir"
  | "atividades.ver"
  | "atividades.criar"
  | "atividades.concluir"
  | "atividades.ajustar_prazo"
  | "atividades.excluir"
  | "recorrencias.gerenciar"
  | "publicacoes.ver"
  | "publicacoes.triar"
  | "publicacoes.arquivar"
  | "oab.gerenciar"
  | "relatorios.ver"
  | "config.tribunais"
  | "config.catalogos"
  | "config.escritorio"
  | "membros.gerenciar"
  | "rotulos.gerenciar";

export type ItemPermissao = {
  chave: Permissao;
  titulo: string;
  descricao: string;
};

export type GrupoPermissao = {
  chave: string;
  titulo: string;
  // quando presente, é a permissão ".ver" da qual as outras do grupo dependem
  verChave: Permissao | null;
  itens: ItemPermissao[];
};

export const GRUPOS_PERMISSAO: GrupoPermissao[] = [
  {
    chave: "clientes",
    titulo: "Clientes",
    verChave: "clientes.ver",
    itens: [
      {
        chave: "clientes.ver",
        titulo: "Ver clientes",
        descricao: "Enxergar a lista e a ficha dos clientes.",
      },
      {
        chave: "clientes.criar",
        titulo: "Cadastrar cliente",
        descricao: "Criar novos clientes.",
      },
      {
        chave: "clientes.editar",
        titulo: "Editar cliente",
        descricao: "Alterar dados de um cliente.",
      },
      {
        chave: "clientes.excluir",
        titulo: "Excluir cliente",
        descricao: "Apagar (soft-delete) um cliente.",
      },
    ],
  },
  {
    chave: "pastas",
    titulo: "Pastas",
    verChave: "pastas.ver",
    itens: [
      {
        chave: "pastas.ver",
        titulo: "Ver pastas",
        descricao: "Enxergar a lista e o detalhe das pastas (casos).",
      },
      {
        chave: "pastas.criar",
        titulo: "Abrir pasta",
        descricao: "Criar novas pastas.",
      },
      {
        chave: "pastas.editar",
        titulo: "Editar pasta",
        descricao: "Alterar dados, área, clientes e status da pasta.",
      },
      {
        chave: "pastas.excluir",
        titulo: "Excluir pasta",
        descricao: "Apagar (soft-delete) uma pasta inteira.",
      },
    ],
  },
  {
    chave: "processos",
    titulo: "Processos",
    verChave: "processos.ver",
    itens: [
      {
        chave: "processos.ver",
        titulo: "Ver processos",
        descricao: "Enxergar os processos judiciais e administrativos das pastas.",
      },
      {
        chave: "processos.criar",
        titulo: "Cadastrar processo",
        descricao: "Adicionar processo judicial ou administrativo a uma pasta.",
      },
      {
        chave: "processos.editar",
        titulo: "Editar processo",
        descricao: "Alterar número, fase, partes e demais dados do processo.",
      },
      {
        chave: "processos.excluir",
        titulo: "Excluir processo",
        descricao: "Apagar (soft-delete) um processo.",
      },
    ],
  },
  {
    chave: "atividades",
    titulo: "Prazos e agenda",
    verChave: "atividades.ver",
    itens: [
      {
        chave: "atividades.ver",
        titulo: "Ver agenda e prazos",
        descricao: "Enxergar a agenda, o calendário e o detalhe das atividades.",
      },
      {
        chave: "atividades.criar",
        titulo: "Lançar atividade",
        descricao: "Criar prazo, compromisso ou monitoramento.",
      },
      {
        chave: "atividades.concluir",
        titulo: "Concluir / verificar",
        descricao: "Marcar cumprida, cancelar e registrar verificação.",
      },
      {
        chave: "atividades.ajustar_prazo",
        titulo: "Ajustar prazo à mão",
        descricao:
          "Mexer na data fatal ou interna calculada pelo motor (ação sensível).",
      },
      {
        chave: "atividades.excluir",
        titulo: "Excluir atividade",
        descricao: "Apagar (soft-delete) uma atividade.",
      },
      {
        chave: "recorrencias.gerenciar",
        titulo: "Gerenciar recorrências",
        descricao: "Criar, encerrar e excluir séries de atividades recorrentes.",
      },
    ],
  },
  {
    chave: "publicacoes",
    titulo: "Publicações (DJEN)",
    verChave: "publicacoes.ver",
    itens: [
      {
        chave: "publicacoes.ver",
        titulo: "Ver publicações",
        descricao: "Enxergar as publicações capturadas do DJEN.",
      },
      {
        chave: "publicacoes.triar",
        titulo: "Triar publicação",
        descricao: "Vincular a um processo e transformar em prazo.",
      },
      {
        chave: "publicacoes.arquivar",
        titulo: "Arquivar publicação",
        descricao: "Arquivar uma publicação que não vira prazo.",
      },
      {
        chave: "oab.gerenciar",
        titulo: "Gerenciar OABs monitoradas",
        descricao: "Adicionar e remover as OABs buscadas no DJEN.",
      },
    ],
  },
  {
    chave: "relatorios",
    titulo: "Relatórios",
    verChave: "relatorios.ver",
    itens: [
      {
        chave: "relatorios.ver",
        titulo: "Ver relatórios",
        descricao: "Abrir os relatórios de produtividade (Etapa 7).",
      },
    ],
  },
  {
    chave: "config",
    titulo: "Configuração do escritório",
    verChave: null,
    itens: [
      {
        chave: "config.tribunais",
        titulo: "Tribunais e calendário",
        descricao: "Editar tribunais, feriados e recesso forense.",
      },
      {
        chave: "config.catalogos",
        titulo: "Catálogos",
        descricao: "Editar tipos de atividade e áreas.",
      },
      {
        chave: "config.escritorio",
        titulo: "Dados do escritório",
        descricao: "Alterar dados do escritório e a margem do prazo interno.",
      },
      {
        chave: "membros.gerenciar",
        titulo: "Gerenciar a equipe",
        descricao: "Convidar, desativar membros e trocar rótulos e permissões.",
      },
      {
        chave: "rotulos.gerenciar",
        titulo: "Gerenciar rótulos",
        descricao: "Criar rótulos (funções) e definir as permissões de cada um.",
      },
    ],
  },
];

// Lista achatada, ordem estável (mesma ordem do catálogo).
export const TODAS_PERMISSOES: Permissao[] = GRUPOS_PERMISSAO.flatMap((g) =>
  g.itens.map((i) => i.chave),
);

const CONJUNTO_PERMISSOES = new Set<string>(TODAS_PERMISSOES);

export function ehPermissao(valor: string): valor is Permissao {
  return CONJUNTO_PERMISSOES.has(valor);
}

const TITULO_POR_PERMISSAO = new Map<Permissao, string>(
  GRUPOS_PERMISSAO.flatMap((g) =>
    g.itens.map((i) => [i.chave, `${g.titulo} · ${i.titulo}`] as const),
  ),
);

// "Pastas · Excluir pasta" — para exibir uma permissão numa lista/select.
export function rotuloDaPermissao(p: Permissao): string {
  return TITULO_POR_PERMISSAO.get(p) ?? p;
}

// Descarta chaves desconhecidas e força o ".ver" de todo grupo que tiver
// qualquer ação marcada. Usado ao salvar as permissões de um rótulo.
export function garantirDependencias(
  permissoes: readonly string[],
): Permissao[] {
  const marcadas = new Set<Permissao>(
    permissoes.filter(ehPermissao) as Permissao[],
  );

  for (const grupo of GRUPOS_PERMISSAO) {
    if (!grupo.verChave) continue;
    const temAlgumaDoGrupo = grupo.itens.some((i) => marcadas.has(i.chave));
    if (temAlgumaDoGrupo) {
      marcadas.add(grupo.verChave);
    }
  }

  // devolve na ordem canônica
  return TODAS_PERMISSOES.filter((p) => marcadas.has(p));
}

// ── Conjuntos-semente (espelham o SQL de `semear_rotulos_padrao`) ────────────
// Advogado: trabalho amplo, mas não mexe na equipe nem nos dados do escritório.
export const PRESET_ADVOGADO: Permissao[] = garantirDependencias([
  "clientes.criar",
  "clientes.editar",
  "clientes.excluir",
  "pastas.criar",
  "pastas.editar",
  "pastas.excluir",
  "processos.criar",
  "processos.editar",
  "processos.excluir",
  "atividades.criar",
  "atividades.concluir",
  "atividades.ajustar_prazo",
  "atividades.excluir",
  "recorrencias.gerenciar",
  "publicacoes.triar",
  "publicacoes.arquivar",
  "oab.gerenciar",
  "relatorios.ver",
  "config.tribunais",
  "config.catalogos",
]);

// Secretária / Recepção: agenda e triagem, sem exclusões nem ajuste de prazo.
export const PRESET_SECRETARIA: Permissao[] = garantirDependencias([
  "clientes.criar",
  "clientes.editar",
  "pastas.ver",
  "processos.ver",
  "atividades.criar",
  "atividades.concluir",
  "recorrencias.gerenciar",
  "publicacoes.triar",
  "publicacoes.arquivar",
]);

// Estagiário: enxerga tudo do trabalho e ajuda a lançar, sem nada destrutivo.
export const PRESET_ESTAGIARIO: Permissao[] = garantirDependencias([
  "clientes.ver",
  "pastas.ver",
  "processos.ver",
  "atividades.criar",
  "atividades.concluir",
  "publicacoes.ver",
]);
