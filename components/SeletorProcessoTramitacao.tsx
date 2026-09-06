"use client";

import { useRouter } from "next/navigation";
import { BuscaSeletor } from "./BuscaSeletor";

// O seletor de processo da tela de Tramitação. Reusa o modal de busca genérico
// (mesmo endpoint de /atividades/nova) mas, em vez de mandar num <form>, navega
// direto pra /tramitacao?processo=<id> assim que se escolhe.

export function SeletorProcessoTramitacao({
  processoAtual = "",
  rotuloAtual = null,
}: {
  processoAtual?: string;
  rotuloAtual?: string | null;
}) {
  const router = useRouter();
  return (
    <BuscaSeletor
      name="processo"
      endpoint="/api/busca/processos"
      valorInicial={processoAtual}
      rotuloInicial={rotuloAtual}
      textoVazio="Escolher processo ou pasta…"
      tituloModal="Buscar processo"
      placeholder="Número, pasta, cliente ou parte…"
      aoEscolher={(id) => {
        // deixa a `vista` ser decidida pela página (default por processo)
        router.push(`/tramitacao?processo=${encodeURIComponent(id)}`);
      }}
    />
  );
}
