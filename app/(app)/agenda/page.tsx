import { exigirSessao } from "@/lib/supabase/sessao";

// Placeholder da agenda. A agenda de verdade (lista ordenada por vencimento,
// estados visuais, concluir) é o Passo 8 do INICIO-AQUI.md.
export default async function PaginaAgenda() {
  const sessao = await exigirSessao();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="titulo-pagina">Agenda de atividades</h1>
        <p className="subtitulo-pagina">
          Escritório <strong>{sessao.escritorioNome}</strong> · você é{" "}
          <strong>{sessao.membro.papel}</strong>.
        </p>
      </div>

      <div className="painel-vazio">
        A agenda entra no Passo 8. Próximo: o motor de cálculo de prazo, depois
        clientes, pastas e o lançamento de prazos.
      </div>
    </div>
  );
}
