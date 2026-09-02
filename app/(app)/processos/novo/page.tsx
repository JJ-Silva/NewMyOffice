import Link from "next/link";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { exigirSessao, exigirPermissao } from "@/lib/supabase/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { listarPastas } from "@/lib/db/pastas";
import { analisarCnj } from "@/lib/domain/cnj";
import {
  buscarProcessoNoDatajud,
  nomeMunicipioIbge,
} from "@/lib/datajud/api";
import {
  normalizarProcessoDatajud,
  sugerirCamposDoProcesso,
  type CamposSugeridosDatajud,
} from "@/lib/domain/processo-datajud";
import { lerRetorno, urlDaTela, comRetorno } from "@/lib/navegacao";
import { FormularioJudicial } from "./formulario-judicial";
import { FormularioAdministrativo } from "./formulario-administrativo";

export default async function PaginaNovoProcesso({
  searchParams,
}: PageProps<"/processos/novo">) {
  const sessao = await exigirSessao();
  exigirPermissao(sessao, "processos.criar");
  const supabase = await criarClienteServidor();
  const params = await searchParams;

  const get = (k: string) => {
    const v = params[k];
    return typeof v === "string" ? v : "";
  };
  const tipo = get("tipo") === "administrativo" ? "administrativo" : "judicial";
  const erro = get("erro") || null;
  const retorno = lerRetorno(params.retorno);
  const urlAtual = urlDaTela("/processos/novo", params);
  const hrefCriarPasta = comRetorno("/pastas/nova", urlAtual);

  const pastas = await listarPastas(supabase, sessao.escritorioId);
  if (pastas.length === 0) {
    redirect(hrefCriarPasta);
  }

  // eco dos campos preenchidos (o form judicial re-renderiza no GET)
  const valores: Record<string, string> = {};
  for (const k of [
    "pasta",
    "numero",
    "tribunal_codigo",
    "vara",
    "comarca",
    "instancia",
    "tipo_acao",
    "fase",
    "polo",
    "valor_causa",
    "data_distribuicao",
    "publicacao", // Etapa 5: veio da triagem de uma publicação do DJEN
    "retorno", // encadeamento de cadastros
  ]) {
    const v = get(k);
    if (v) valores[k] = v;
  }

  // "Buscar no DataJud" (botão do form judicial): consulta o CNJ na API pública
  // do CNJ e pré-preenche vara/comarca/classe/instância/data. Melhor esforço.
  let datajud: CamposSugeridosDatajud | null = null;
  let datajudErro: string | null = null;
  if (tipo === "judicial" && get("buscar_datajud") === "1") {
    const analise = analisarCnj(get("numero"));
    if (analise.ok) {
      try {
        const bruto = await buscarProcessoNoDatajud({
          numeroDigitos: analise.cnj.formatado.replace(/\D/g, ""),
          segmento: analise.cnj.partes.segmento,
          tribunal: analise.cnj.partes.tribunal,
        });
        const dj = normalizarProcessoDatajud(bruto);
        if (!dj) {
          datajudErro = "O DataJud não retornou esse processo.";
        } else {
          const municipio = dj.municipioIbge
            ? await nomeMunicipioIbge(dj.municipioIbge)
            : null;
          datajud = sugerirCamposDoProcesso(dj, municipio);
          // preenche onde o usuário ainda não digitou
          const mapa: Record<string, string | null> = {
            vara: datajud.vara,
            comarca: datajud.comarca,
            instancia: datajud.instancia,
            tipo_acao: datajud.tipoAcao,
            data_distribuicao: datajud.dataDistribuicao,
          };
          for (const [k, v] of Object.entries(mapa)) {
            if (v && !valores[k]) valores[k] = v;
          }
        }
      } catch {
        datajudErro =
          "Não deu para consultar o DataJud agora. Preencha à mão ou tente de novo.";
      }
    }
  }

  // troca a aba mantendo o que já foi preenchido
  const abaHref = (novoTipo: string) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(valores)) {
      if (k !== "publicacao" || novoTipo === "judicial") p.set(k, v);
    }
    p.set("tipo", novoTipo);
    return `/processos/novo?${p.toString()}` as Route;
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Link
          href={(retorno ?? "/processos") as Route}
          className="link-acao self-start"
        >
          {retorno ? "← Voltar" : "← Voltar para processos"}
        </Link>
        <h1 className="titulo-pagina">Cadastrar processo</h1>
      </div>

      <div className="abas max-w-[360px]">
        <Link href={abaHref("judicial")} className="aba" data-ativa={tipo === "judicial"}>
          Judicial
        </Link>
        <Link
          href={abaHref("administrativo")}
          className="aba"
          data-ativa={tipo === "administrativo"}
        >
          Administrativo
        </Link>
      </div>

      {tipo === "judicial" ? (
        <FormularioJudicial
          pastas={pastas}
          valores={valores}
          erro={erro}
          retorno={retorno}
          hrefCriarPasta={hrefCriarPasta}
          datajud={datajud}
          datajudErro={datajudErro}
        />
      ) : (
        <FormularioAdministrativo
          pastas={pastas}
          valores={valores}
          erro={erro}
          retorno={retorno}
          hrefCriarPasta={hrefCriarPasta}
        />
      )}
    </div>
  );
}
