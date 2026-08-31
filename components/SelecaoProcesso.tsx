import type { ProcessoParaSelecao } from "@/lib/db/processos";

// Rótulo de um processo num seletor: o número + o que ele é.
//   geral         → "2026/000001 · geral da pasta"
//   judicial      → "1000764-35.2025.8.26.0602 · judicial"
//   administrativo→ "12345/2026 · administrativo"
export function rotuloDoProcesso(p: {
  tipo: string;
  numero: string | null;
}): string {
  if (p.tipo === "geral") {
    return `${p.numero ?? "geral"} · geral da pasta`;
  }
  const t = p.tipo === "judicial" ? "judicial" : "administrativo";
  return `${p.numero ?? "sem número"} · ${t}`;
}

// Seletor "em qual processo cadastrar a atividade" — agrupado por pasta.
// Toda atividade pertence a um processo (o 'geral' representa o trabalho da
// pasta sem processo formal).
export function SelecaoProcesso({
  processos,
  name = "processo_id",
  value,
  required = true,
}: {
  processos: ProcessoParaSelecao[];
  name?: string;
  value?: string;
  required?: boolean;
}) {
  const grupos: {
    pastaId: string;
    rotulo: string;
    itens: ProcessoParaSelecao[];
  }[] = [];
  for (const p of processos) {
    let g = grupos.find((x) => x.pastaId === p.pastaId);
    if (!g) {
      g = {
        pastaId: p.pastaId,
        rotulo:
          (p.pastaNome ? `${p.pastaNome} · ` : "") +
          p.pastaCodigo +
          (p.clienteNome ? ` · ${p.clienteNome}` : ""),
        itens: [],
      };
      grupos.push(g);
    }
    g.itens.push(p);
  }

  return (
    <select
      name={name}
      required={required}
      defaultValue={value ?? ""}
      className="campo"
    >
      <option value="" disabled>
        Selecione o processo…
      </option>
      {grupos.map((g) => (
        <optgroup key={g.pastaId} label={g.rotulo}>
          {g.itens.map((p) => (
            <option key={p.id} value={p.id}>
              {rotuloDoProcesso(p)}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
