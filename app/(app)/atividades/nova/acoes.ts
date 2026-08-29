"use server";

import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { exigirSessao } from "@/lib/supabase/sessao";
import { hojeNoBrasil } from "@/lib/hoje";
import { criarPrazo } from "@/lib/db/atividades";
import { lerCampos, calcular } from "./calculo";

// Salva o prazo. RECALCULA tudo do zero — não confia nas datas do formulário.
export async function salvarPrazo(formData: FormData) {
  const sessao = await exigirSessao();
  const supabase = await criarClienteServidor();

  const campos = lerCampos((k) => {
    const v = formData.get(k);
    return typeof v === "string" ? v : null;
  });

  const calc = await calcular(
    supabase,
    sessao.escritorioId,
    campos,
    hojeNoBrasil(),
  );

  const paramsBase = new URLSearchParams({
    pasta: campos.pastaId,
    processo: campos.processoId,
    tipo: campos.tipoAtividadeId,
    tribunal: campos.tribunalId ?? "",
    evento_tipo: campos.eventoTipo,
    evento_data: campos.eventoData,
    dobro: campos.dobro ? "1" : "",
    dias: campos.diasInformado ? String(campos.diasInformado) : "",
    titulo: campos.titulo,
  });

  if (!calc.ok) {
    paramsBase.set("erro", calc.erro);
    redirect(`/atividades/nova?${paramsBase.toString()}`);
  }

  const { tipo, natureza, dias, resultado } = calc.dados;
  const titulo = campos.titulo.trim() || tipo.nome;

  try {
    await criarPrazo(supabase, {
      escritorioId: sessao.escritorioId,
      processoId: campos.processoId,
      tipoAtividadeId: tipo.id,
      titulo,
      responsavelId: sessao.membro.id,
      tribunalId: campos.tribunalId,
      natureza,
      dias,
      dobro: campos.dobro,
      excluirFeriados: true,
      eventoTipo: campos.eventoTipo,
      eventoData: campos.eventoData,
      prazoFatalCalculado: resultado.prazoFatalCalculado,
      prazoInternoCalculado: resultado.prazoInternoCalculado,
      prazoApertado: resultado.prazoApertado,
      memoriaCalculo: resultado.memoriaCalculo,
    });
  } catch (e) {
    paramsBase.set(
      "erro",
      e instanceof Error ? e.message : "Falha ao salvar o prazo.",
    );
    redirect(`/atividades/nova?${paramsBase.toString()}`);
  }

  redirect("/agenda?lancado=1");
}
