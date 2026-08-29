import { exigirSessao } from "@/lib/supabase/sessao";

// Placeholder da agenda. A agenda de verdade (lista ordenada por vencimento,
// estados visuais, concluir) é o Passo 8 do INICIO-AQUI.md.
export default async function PaginaAgenda() {
  const sessao = await exigirSessao();

  return (
    <div>
      <h1 className="text-xl font-semibold">Agenda</h1>
      <p className="mt-2 text-sm text-texto-secundario">
        Você está no escritório <strong>{sessao.escritorioNome}</strong> como{" "}
        <strong>{sessao.membro.papel}</strong>.
      </p>
      <p className="mt-4 text-sm text-texto-secundario">
        A agenda de atividades entra no Passo 8. Próximo: Configurações
        (tribunais e feriados) e o motor de cálculo de prazo.
      </p>
    </div>
  );
}
