// Autorização — quem pode fazer o quê dentro de um escritório (Etapa 6).
//
// Modelo (plano §5, decisão P6, refinado):
//   - RÓTULO  = a função da pessoa no escritório (o próprio escritório cria).
//               Cada rótulo carrega um conjunto de permissões.
//   - MEMBRO  = a pessoa. Herda as permissões do rótulo e pode ter overrides
//               (liga/desliga uma permissão específica só para ela).
//   - FUNDADOR = quem criou o escritório. Flag imutável, passa por cima de tudo,
//               não pode ser desativado nem perder acesso. Não é um rótulo e
//               não aparece na hierarquia — a pessoa ainda tem um rótulo normal.
//
// Ordem de decisão em `podeFazer`:
//   1. membro inativo → não.
//   2. fundador → sim (qualquer permissão).
//   3. override do membro para essa permissão → usa o valor do override.
//   4. o rótulo tem a permissão? → sim/não.
//   5. (nada bateu) → não. Negado por padrão.
//
// Regra pura, sem Supabase e sem React. O mesmo cálculo roda no RLS
// (função SQL `tem_permissao`) — os dois têm de concordar.

import type { Permissao } from "./permissoes";

export type ContextoAutorizacao = {
  ativo: boolean;
  fundador: boolean;
  // permissões que vêm do rótulo do membro
  permissoesDoRotulo: ReadonlySet<Permissao>;
  // override por pessoa: true = concede, false = nega. Ausente = sem override.
  overrides: ReadonlyMap<Permissao, boolean>;
};

export function podeFazer(
  ctx: ContextoAutorizacao,
  permissao: Permissao,
): boolean {
  if (!ctx.ativo) {
    return false;
  }
  if (ctx.fundador) {
    return true;
  }

  const override = ctx.overrides.get(permissao);
  if (override !== undefined) {
    return override;
  }

  return ctx.permissoesDoRotulo.has(permissao);
}

// O conjunto FINAL de permissões do membro (rótulo + overrides), já resolvido.
// É o que a sessão carrega para a UI decidir o que mostrar.
export function permissoesEfetivas(
  ctx: ContextoAutorizacao,
): Set<Permissao> {
  if (!ctx.ativo) {
    return new Set();
  }

  const efetivas = new Set<Permissao>(ctx.permissoesDoRotulo);

  for (const [permissao, concedida] of ctx.overrides) {
    if (concedida) {
      efetivas.add(permissao);
    } else {
      efetivas.delete(permissao);
    }
  }

  return efetivas;
}

// Um membro fundador enxerga e faz tudo, tenha rótulo ou não.
export function contextoDoFundador(): ContextoAutorizacao {
  return {
    ativo: true,
    fundador: true,
    permissoesDoRotulo: new Set(),
    overrides: new Map(),
  };
}
