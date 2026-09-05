// Consulta o DataJud por número — usado pelo formulário de processo judicial
// (client) ao sair do campo do número. Fica fora do render da página para não
// travar a tela enquanto a API do CNJ responde.
//
// GET /api/datajud?numero=<CNJ>  →  { campos } | { erro }

import { NextResponse } from "next/server";
import { usuarioLogado } from "@/lib/supabase/sessao";
import { analisarCnj } from "@/lib/domain/cnj";
import {
  buscarProcessoNoDatajud,
  nomeMunicipioIbge,
} from "@/lib/datajud/api";
import {
  normalizarProcessoDatajud,
  sugerirCamposDoProcesso,
} from "@/lib/domain/processo-datajud";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // O proxy não protege /api/* — a rota se protege.
  const usuario = await usuarioLogado();
  if (!usuario) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const numero = (new URL(request.url).searchParams.get("numero") ?? "").trim();
  const analise = analisarCnj(numero);
  if (!analise.ok) {
    return NextResponse.json(
      { erro: "O DataJud só consulta por número CNJ." },
      { status: 400 },
    );
  }

  try {
    const bruto = await buscarProcessoNoDatajud({
      numeroDigitos: analise.cnj.formatado.replace(/\D/g, ""),
      segmento: analise.cnj.partes.segmento,
      tribunal: analise.cnj.partes.tribunal,
    });
    const dj = normalizarProcessoDatajud(bruto);
    if (!dj) {
      return NextResponse.json({ erro: "O DataJud não retornou esse processo." });
    }
    const municipio = dj.municipioIbge
      ? await nomeMunicipioIbge(dj.municipioIbge)
      : null;
    return NextResponse.json({ campos: sugerirCamposDoProcesso(dj, municipio) });
  } catch {
    return NextResponse.json({
      erro: "Não deu para consultar o DataJud agora. Preencha à mão ou tente de novo.",
    });
  }
}
