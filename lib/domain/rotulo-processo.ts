// Como um processo se apresenta num resultado de busca / seletor: duas linhas.
//
// Regra de negócio da apresentação (decidida com o Jefferson):
//  - o processo "geral" NÃO se mostra com esse jargão — ele É a pasta:
//      primário  = nome da pasta (ou o código, se a pasta não tem nome)
//      secundário= código · cliente
//  - judicial / administrativo lideram pelo número:
//      primário  = número do processo
//      secundário= pasta · cliente · tipo
//
// Puro (sem Supabase, sem React) — a camada de dados passa os campos já lidos.

export type ProcessoRotulavel = {
  tipo: "geral" | "judicial" | "administrativo";
  numero: string | null;
  pastaCodigo: string | null;
  pastaNome: string | null;
  clienteNome: string | null;
};

export type LinhasProcesso = {
  primario: string;
  secundario: string;
};

const NOME_TIPO: Record<ProcessoRotulavel["tipo"], string> = {
  geral: "",
  judicial: "judicial",
  administrativo: "administrativo",
};

export function linhasDoProcesso(p: ProcessoRotulavel): LinhasProcesso {
  if (p.tipo === "geral") {
    return {
      primario: p.pastaNome ?? p.pastaCodigo ?? "pasta sem código",
      secundario: [p.pastaCodigo, p.clienteNome].filter(Boolean).join(" · "),
    };
  }

  const pasta = p.pastaNome ?? p.pastaCodigo;
  return {
    primario: p.numero ?? "sem número",
    secundario: [pasta, p.clienteNome, NOME_TIPO[p.tipo]]
      .filter(Boolean)
      .join(" · "),
  };
}
