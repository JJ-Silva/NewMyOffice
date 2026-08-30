// Cron diário (Vercel Cron) — busca no DJEN as publicações do DIA para todos os
// escritórios com OAB ativa. Configurado em vercel.json:
//   { "path": "/api/cron/buscar-djen", "schedule": "0 10 * * *" }  → 10h UTC = 7h BRT
//
// A Vercel chama esta rota com o header Authorization: Bearer <CRON_SECRET>
// (quando a env CRON_SECRET existe). Sem esse segredo, 401.
//
// Busca só o dia atual — pesquisa mais funda (7/15/30 dias) é manual, na tela.

import { hojeNoBrasil } from "@/lib/hoje";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import {
  escritoriosComOabAtiva,
  sincronizarEscritorio,
} from "@/lib/djen/sincronizar";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const segredo = process.env.CRON_SECRET;
  const autorizacao = request.headers.get("authorization");
  if (!segredo || autorizacao !== `Bearer ${segredo}`) {
    return new Response("não autorizado", { status: 401 });
  }

  const admin = criarClienteAdmin();
  const hoje = hojeNoBrasil();

  let escritorios: string[];
  try {
    escritorios = await escritoriosComOabAtiva(admin);
  } catch (e) {
    return Response.json(
      { erro: e instanceof Error ? e.message : "falha ao listar escritórios" },
      { status: 500 },
    );
  }

  const resultados: Array<{
    escritorio: string;
    novas?: number;
    jaExistiam?: number;
    erro?: string;
  }> = [];

  for (const escritorioId of escritorios) {
    try {
      const r = await sincronizarEscritorio(admin, escritorioId, {
        dataInicio: hoje,
        dataFim: hoje,
      });
      resultados.push({ escritorio: escritorioId, ...r });
    } catch (e) {
      resultados.push({
        escritorio: escritorioId,
        erro: e instanceof Error ? e.message : "falha na sincronização",
      });
    }
  }

  return Response.json({
    executadoEm: new Date().toISOString(),
    dia: hoje,
    escritorios: resultados.length,
    resultados,
  });
}
