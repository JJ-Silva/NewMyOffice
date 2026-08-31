"use client";

import { useState } from "react";
import {
  GRUPOS_PERMISSAO,
  garantirDependencias,
  type Permissao,
} from "@/lib/domain/permissoes";

// Grade de checkboxes das permissões de um rótulo. Cada checkbox marcado vira
// um <input name={name}> no submit → a action lê formData.getAll(name).
// Marcar qualquer ação de um grupo liga o "ver" do grupo junto (mesma regra do
// servidor: garantirDependencias). O "ver" fica travado enquanto houver irmã.
export function MatrizPermissoes({
  name = "permissoes",
  marcadas,
}: {
  name?: string;
  marcadas: Permissao[];
}) {
  const [conjunto, setConjunto] = useState<Set<Permissao>>(
    () => new Set(garantirDependencias(marcadas)),
  );

  function alternar(permissao: Permissao, ligado: boolean) {
    const proximo = new Set(conjunto);
    if (ligado) proximo.add(permissao);
    else proximo.delete(permissao);
    setConjunto(new Set(garantirDependencias([...proximo])));
  }

  return (
    <div className="flex flex-col gap-4">
      {GRUPOS_PERMISSAO.map((grupo) => {
        const temOutra = grupo.itens.some(
          (i) => i.chave !== grupo.verChave && conjunto.has(i.chave),
        );
        return (
          <fieldset
            key={grupo.chave}
            className="flex flex-col gap-1.5 rounded-lg border border-tint-2 p-3"
          >
            <legend className="px-1 text-[12px] font-semibold uppercase tracking-wide text-texto-secundario">
              {grupo.titulo}
            </legend>
            {grupo.itens.map((item) => {
              const ehVer = item.chave === grupo.verChave;
              const travado = ehVer && temOutra;
              return (
                <label
                  key={item.chave}
                  className="flex items-start gap-2 text-[13px]"
                >
                  <input
                    type="checkbox"
                    name={name}
                    value={item.chave}
                    checked={conjunto.has(item.chave)}
                    disabled={travado}
                    onChange={(e) => alternar(item.chave, e.target.checked)}
                    className="mt-0.5"
                  />
                  <span className="flex flex-col">
                    <span className="font-medium">
                      {item.titulo}
                      {travado && (
                        <span className="ml-1 text-[11px] font-normal text-texto-secundario">
                          (exigido pelas ações marcadas)
                        </span>
                      )}
                    </span>
                    <span className="text-[12px] text-texto-secundario">
                      {item.descricao}
                    </span>
                  </span>
                </label>
              );
            })}
          </fieldset>
        );
      })}
    </div>
  );
}
