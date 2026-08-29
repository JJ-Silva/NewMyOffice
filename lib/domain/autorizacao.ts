// Autorização — quem pode fazer o quê dentro de um escritório.
//
// Etapa 1 (decisão P6 do plano §5): toda ação de negócio (prazos, pastas,
// clientes) é liberada a qualquer membro ATIVO. Só o `dono` acessa
// Configurações (tribunais, feriados, catálogos, membros).
// O gate fino por papel é a Etapa 6 — mas o código já chama `podeFazer`
// desde agora para não ter de "colar" autorização depois.

export type Papel = "dono" | "advogado" | "secretaria";

// As ações que hoje têm restrição. Cresce na Etapa 6.
export type Acao =
  | "acessar_configuracoes"
  | "gerenciar_membros"
  | "trabalhar"; // prazos, pastas, clientes, agenda — o dia a dia

export type MembroParaAutorizacao = {
  papel: Papel;
  ativo: boolean;
};

export function podeFazer(membro: MembroParaAutorizacao, acao: Acao): boolean {
  // Membro inativo não faz nada.
  if (!membro.ativo) {
    return false;
  }

  switch (acao) {
    // Só o dono mexe em Configurações e em membros (Etapa 1).
    case "acessar_configuracoes":
    case "gerenciar_membros":
      return membro.papel === "dono";

    // Todo o trabalho do dia a dia é liberado a membro ativo.
    case "trabalhar":
      return true;
  }
}
