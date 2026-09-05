// Busca de processo para o seletor (components/BuscaSeletor) em atividades/nova.
// Fica numa rota própria porque o modal busca a cada tecla (debounce no client)
// e o render da página não pode depender disso.
//
// GET /api/busca/processos?q=<texto>&offset=<n>
//   → { itens: { id, primario, secundario }[], temMais, truncado }
//
// Sem gate de permissão explícito: roda com o client de sessão, então a RLS de
// processo/pasta/cliente/parte ('*.ver') já limita o que aparece — igual ao
// seletor <select> que isto substitui.

import { NextResponse } from "next/server";
import { sessaoAtual } from "@/lib/supabase/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { buscarProcessosParaSelecao } from "@/lib/db/processos";
import { linhasDoProcesso } from "@/lib/domain/rotulo-processo";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // O proxy não protege /api/* — a rota se protege.
  const sessao = await sessaoAtual();
  if (!sessao) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const q = params.get("q") ?? "";
  const offset = Number.parseInt(params.get("offset") ?? "0", 10) || 0;

  const supabase = await criarClienteServidor();
  const { itens, temMais, truncado } = await buscarProcessosParaSelecao(
    supabase,
    sessao.escritorioId,
    { q, offset },
  );

  return NextResponse.json({
    itens: itens.map((p) => ({ id: p.id, ...linhasDoProcesso(p) })),
    temMais,
    truncado,
  });
}
