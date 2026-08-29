"use server";

import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { exigirSessao } from "@/lib/supabase/sessao";
import { criarPasta } from "@/lib/db/pastas";

export async function criarPastaAction(formData: FormData) {
  const sessao = await exigirSessao();

  const clienteId = String(formData.get("cliente_id") ?? "").trim();
  const nome = String(formData.get("nome") ?? "").trim() || null;
  const areaId = String(formData.get("area_id") ?? "").trim() || null;
  const objetivo = String(formData.get("objetivo") ?? "").trim() || null;
  const objeto = String(formData.get("objeto") ?? "").trim() || null;

  if (!clienteId) {
    redirect(
      "/pastas/nova?erro=" + encodeURIComponent("Escolha o cliente da pasta."),
    );
  }

  const supabase = await criarClienteServidor();

  let pastaId: string;
  try {
    const criada = await criarPasta(supabase, {
      escritorioId: sessao.escritorioId,
      nome,
      areaId,
      objetivo,
      objeto,
      clienteIds: [clienteId],
    });
    pastaId = criada.id;
  } catch (e) {
    redirect(
      "/pastas/nova?erro=" +
        encodeURIComponent(
          e instanceof Error ? e.message : "Falha ao criar a pasta.",
        ),
    );
  }

  // Passo 7 leva daqui para o lançamento de prazo. Por ora, volta para a lista.
  redirect(`/pastas?criada=${pastaId}`);
}
