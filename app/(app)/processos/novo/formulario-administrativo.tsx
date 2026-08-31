import Link from "next/link";
import type { Route } from "next";
import type { PastaResumo } from "@/lib/db/pastas";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { salvarProcessoAdministrativo } from "./acoes";

const POLOS = [
  { valor: "autor", label: "Requerente" },
  { valor: "reu", label: "Requerido" },
  { valor: "terceiro", label: "Terceiro interessado" },
];

export function FormularioAdministrativo({
  pastas,
  valores,
  erro,
  retorno,
  hrefCriarPasta,
}: {
  pastas: PastaResumo[];
  valores: Record<string, string>;
  erro: string | null;
  retorno: string | null;
  hrefCriarPasta: string;
}) {
  return (
    <form
      action={salvarProcessoAdministrativo}
      className="card flex max-w-[560px] flex-col gap-4 p-6"
    >
      <input type="hidden" name="tipo" value="administrativo" />
      {retorno && <input type="hidden" name="retorno" value={retorno} />}
      <h2 className="titulo-secao">Processo administrativo</h2>

      {erro && (
        <p className="rounded-lg border border-atrasado bg-[var(--atrasado-fundo)] px-3 py-2 text-sm text-atrasado">
          {erro}
        </p>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="flex items-center justify-between">
          <span className="rotulo">Pasta vinculada</span>
          <Link
            href={hrefCriarPasta as Route}
            className="text-xs font-medium text-teal hover:underline"
          >
            + criar pasta
          </Link>
        </span>
        <select
          name="pasta"
          required
          defaultValue={valores.pasta ?? ""}
          className="campo"
        >
          <option value="" disabled>
            Selecione a pasta…
          </option>
          {pastas.map((p) => (
            <option key={p.id} value={p.id}>
              {(p.nome ?? p.codigo) +
                (p.clientes[0] ? ` · ${p.clientes[0].nome}` : "")}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="rotulo">Número do processo administrativo</span>
        <input name="numero_adm" className="campo" />
      </label>

      <div className="grid gap-4 [grid-template-columns:1fr_150px]">
        <label className="flex flex-col gap-1.5">
          <span className="rotulo">Órgão julgador</span>
          <input name="orgao_julgador" className="campo" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="rotulo">Esfera</span>
          <select name="esfera" className="campo" defaultValue="">
            <option value="">—</option>
            <option value="federal">Federal</option>
            <option value="estadual">Estadual</option>
            <option value="municipal">Municipal</option>
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="rotulo">Assunto</span>
        <input name="assunto" className="campo" />
      </label>

      <div className="grid gap-4 [grid-template-columns:1fr_1fr]">
        <label className="flex flex-col gap-1.5">
          <span className="rotulo">Fase atual</span>
          <input name="fase" className="campo" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="rotulo">Nosso polo</span>
          <select name="polo" className="campo" defaultValue="">
            <option value="">—</option>
            {POLOS.map((p) => (
              <option key={p.valor} value={p.valor}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="rotulo">Data de protocolo</span>
        <input type="date" name="data_protocolo" className="campo" />
      </label>

      <div className="flex gap-3 pt-1">
        <BotaoEnviar>Salvar processo</BotaoEnviar>
        <Link
          href={(retorno ?? "/processos") as Route}
          className="flex h-10 items-center rounded-lg border border-tint-3 bg-white px-4 text-sm font-medium"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
