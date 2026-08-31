import { BotaoEnviar } from "@/components/BotaoEnviar";
import { MatrizPermissoes } from "@/components/MatrizPermissoes";
import type { Permissao } from "@/lib/domain/permissoes";

// Formulário de rótulo (nome + descrição + matriz de permissões).
// Serve tanto para criar (sem `id`) quanto para editar (com `id`).
export function FormularioRotulo({
  action,
  id,
  nome = "",
  descricao = "",
  permissoes = [],
  rotuloEnviar,
}: {
  action: (formData: FormData) => void | Promise<void>;
  id?: string;
  nome?: string;
  descricao?: string;
  permissoes?: Permissao[];
  rotuloEnviar: string;
}) {
  return (
    <form action={action} className="flex flex-col gap-3">
      {id && <input type="hidden" name="id" value={id} />}
      <div className="grid gap-2.5 [grid-template-columns:1fr_1.4fr]">
        <label className="flex flex-col gap-1.5">
          <span className="rotulo">Nome do rótulo</span>
          <input
            name="nome"
            required
            defaultValue={nome}
            placeholder="Ex.: Advogado sênior, Estagiário, Financeiro"
            className="campo"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="rotulo">Descrição (opcional)</span>
          <input
            name="descricao"
            defaultValue={descricao}
            placeholder="Para que serve este rótulo"
            className="campo"
          />
        </label>
      </div>

      <span className="rotulo">Permissões</span>
      <MatrizPermissoes marcadas={permissoes} />

      <BotaoEnviar className="botao-primario h-[38px] self-start">
        {rotuloEnviar}
      </BotaoEnviar>
    </form>
  );
}
