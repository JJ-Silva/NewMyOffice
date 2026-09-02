import Link from "next/link";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { analisarCnj } from "@/lib/domain/cnj";
import {
  identificarTribunal,
  tribunalPorCodigo,
  TRIBUNAIS_CONHECIDOS,
} from "@/lib/domain/tribunais-cnj";
import type { ProcessoEdicao } from "@/lib/db/processos";
import { salvarJudicial, salvarAdministrativo, excluir } from "./acoes";

const POLOS = [
  { valor: "", label: "—" },
  { valor: "autor", label: "Autor / requerente" },
  { valor: "reu", label: "Réu / requerido" },
  { valor: "terceiro", label: "Terceiro interessado" },
];
const STATUS = [
  { valor: "ativo", label: "Ativo" },
  { valor: "suspenso", label: "Suspenso" },
  { valor: "arquivado", label: "Arquivado" },
  { valor: "encerrado", label: "Encerrado" },
];

function Campo({
  rotulo,
  children,
  full = false,
}: {
  rotulo: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <label className={"flex flex-col gap-1.5" + (full ? " sm:col-span-2" : "")}>
      <span className="rotulo">{rotulo}</span>
      {children}
    </label>
  );
}

function BlocoExcluir({ id }: { id: string }) {
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-texto-secundario">
        Excluir este processo
      </summary>
      <form action={excluir} className="mt-2 flex items-end gap-2">
        <input type="hidden" name="id" value={id} />
        <label className="flex flex-col gap-1.5">
          <span className="rotulo">
            Some das listas (soft-delete). Digite <strong>EXCLUIR</strong>.
          </span>
          <input
            name="confirmacao"
            required
            placeholder="EXCLUIR"
            className="campo w-[220px]"
          />
        </label>
        <BotaoEnviar className="botao-perigo h-[38px]" rotuloOcupado="…">
          Excluir processo
        </BotaoEnviar>
      </form>
    </details>
  );
}

export function FormularioJudicial({
  processo,
  podeEditar,
  podeExcluir,
}: {
  processo: ProcessoEdicao;
  podeEditar: boolean;
  podeExcluir: boolean;
}) {
  const j = processo.judicial;
  const numeroAtual = j?.cnj ?? processo.numero ?? "";
  const analise = analisarCnj(numeroAtual);
  const ehCnj = analise.ok;
  const tribunal = analise.ok ? identificarTribunal(analise.cnj.partes) : null;
  const tribunalManual = !ehCnj
    ? tribunalPorCodigo(j?.tribunalCodigoCnj ?? 0)
    : null;
  return (
    <div className="flex flex-col gap-4">
      {!podeEditar && <AvisoSomenteLeitura />}
      <form
        action={salvarJudicial}
        className="card grid gap-4 p-6 [grid-template-columns:1fr] sm:[grid-template-columns:1fr_1fr]"
      >
        <input type="hidden" name="id" value={processo.id} />
        <fieldset disabled={!podeEditar} className="contents">

        <Campo rotulo="Número do processo">
          <input
            name="numero"
            required
            defaultValue={numeroAtual}
            placeholder="CNJ, REsp, RE, número antigo…"
            className="campo tabular-nums"
          />
        </Campo>

        {ehCnj ? (
          <Campo rotulo="Tribunal (pelo número)">
            <input
              value={tribunal ? `${tribunal.sigla} — ${tribunal.nome}` : "—"}
              readOnly
              disabled
              className="campo bg-tint-1 text-texto-secundario"
            />
          </Campo>
        ) : (
          <Campo rotulo="Tribunal">
            <select
              name="tribunal_codigo"
              defaultValue={tribunalManual?.codigo ?? ""}
              className="campo"
            >
              <option value="" disabled>
                Selecione o tribunal…
              </option>
              {TRIBUNAIS_CONHECIDOS.map((t) => (
                <option key={t.codigo} value={t.codigo}>
                  {t.sigla} — {t.nome}
                </option>
              ))}
            </select>
          </Campo>
        )}

        <Campo rotulo="Instância">
          <input
            name="instancia"
            defaultValue={j?.instancia ?? ""}
            placeholder="1º grau, 2º grau…"
            className="campo"
          />
        </Campo>

        <Campo rotulo="Vara">
          <input name="vara" defaultValue={j?.vara ?? ""} className="campo" />
        </Campo>

        <Campo rotulo="Comarca">
          <input
            name="comarca"
            defaultValue={j?.comarca ?? ""}
            className="campo"
          />
        </Campo>

        <Campo rotulo="Juízo">
          <input name="juizo" defaultValue={j?.juizo ?? ""} className="campo" />
        </Campo>

        <Campo rotulo="Tipo de ação">
          <input
            name="tipo_acao"
            defaultValue={j?.tipoAcao ?? ""}
            className="campo"
          />
        </Campo>

        <Campo rotulo="Fase atual">
          <input name="fase" defaultValue={j?.fase ?? ""} className="campo" />
        </Campo>

        <Campo rotulo="Nosso polo">
          <select
            name="polo"
            defaultValue={processo.poloCliente ?? ""}
            className="campo"
          >
            {POLOS.map((p) => (
              <option key={p.valor} value={p.valor}>
                {p.label}
              </option>
            ))}
          </select>
        </Campo>

        <Campo rotulo="Valor da causa (R$)">
          <input
            type="number"
            step="0.01"
            min="0"
            name="valor_causa"
            defaultValue={j?.valorCausa ?? ""}
            className="campo"
          />
        </Campo>

        <Campo rotulo="Data de distribuição">
          <input
            type="date"
            name="data_distribuicao"
            defaultValue={j?.dataDistribuicao ?? ""}
            className="campo"
          />
        </Campo>

        <Campo rotulo="Situação do processo">
          <select
            name="status"
            defaultValue={processo.status}
            className="campo"
          >
            {STATUS.map((s) => (
              <option key={s.valor} value={s.valor}>
                {s.label}
              </option>
            ))}
          </select>
        </Campo>

        <Campo rotulo="Observações" full>
          <textarea
            name="observacoes"
            defaultValue={processo.observacoes ?? ""}
            rows={3}
            className="campo"
          />
        </Campo>

        <div className="flex gap-3 pt-1 sm:col-span-2">
          {podeEditar && (
            <BotaoEnviar className="botao-primario h-[42px]">
              Salvar processo
            </BotaoEnviar>
          )}
          <Link
            href="/processos"
            className="flex h-[42px] items-center rounded-lg border border-tint-3 bg-white px-4 text-sm font-medium"
          >
            {podeEditar ? "Cancelar" : "Voltar"}
          </Link>
        </div>
        </fieldset>
      </form>

      {podeExcluir && <BlocoExcluir id={processo.id} />}
    </div>
  );
}

function AvisoSomenteLeitura() {
  return (
    <p className="rounded-lg border border-tint-2 bg-tint-1 px-3 py-2 text-[13px] text-texto-secundario">
      Você pode ver este processo, mas seu rótulo não permite editar.
    </p>
  );
}

export function FormularioAdministrativo({
  processo,
  podeEditar,
  podeExcluir,
}: {
  processo: ProcessoEdicao;
  podeEditar: boolean;
  podeExcluir: boolean;
}) {
  const a = processo.administrativo;
  return (
    <div className="flex flex-col gap-4">
      {!podeEditar && <AvisoSomenteLeitura />}
      <form
        action={salvarAdministrativo}
        className="card grid gap-4 p-6 [grid-template-columns:1fr] sm:[grid-template-columns:1fr_1fr]"
      >
        <input type="hidden" name="id" value={processo.id} />
        <fieldset disabled={!podeEditar} className="contents">

        <Campo rotulo="Número do processo administrativo">
          <input
            name="numero_adm"
            defaultValue={a?.numeroAdm ?? processo.numero ?? ""}
            className="campo"
          />
        </Campo>

        <Campo rotulo="Esfera">
          <select
            name="esfera"
            defaultValue={a?.esfera ?? ""}
            className="campo"
          >
            <option value="">—</option>
            <option value="federal">Federal</option>
            <option value="estadual">Estadual</option>
            <option value="municipal">Municipal</option>
          </select>
        </Campo>

        <Campo rotulo="Órgão julgador">
          <input
            name="orgao_julgador"
            defaultValue={a?.orgaoJulgador ?? ""}
            className="campo"
          />
        </Campo>

        <Campo rotulo="Secretaria">
          <input
            name="secretaria"
            defaultValue={a?.secretaria ?? ""}
            className="campo"
          />
        </Campo>

        <Campo rotulo="Tipo">
          <input name="tipo" defaultValue={a?.tipo ?? ""} className="campo" />
        </Campo>

        <Campo rotulo="Assunto">
          <input
            name="assunto"
            defaultValue={a?.assunto ?? ""}
            className="campo"
          />
        </Campo>

        <Campo rotulo="Autoridade competente">
          <input
            name="autoridade_competente"
            defaultValue={a?.autoridadeCompetente ?? ""}
            className="campo"
          />
        </Campo>

        <Campo rotulo="Protocolo">
          <input
            name="protocolo"
            defaultValue={a?.protocolo ?? ""}
            className="campo"
          />
        </Campo>

        <Campo rotulo="Data de protocolo">
          <input
            type="date"
            name="data_protocolo"
            defaultValue={a?.dataProtocolo ?? ""}
            className="campo"
          />
        </Campo>

        <Campo rotulo="Fase atual">
          <input name="fase" defaultValue={a?.fase ?? ""} className="campo" />
        </Campo>

        <Campo rotulo="Nosso polo">
          <select
            name="polo"
            defaultValue={processo.poloCliente ?? ""}
            className="campo"
          >
            {POLOS.map((p) => (
              <option key={p.valor} value={p.valor}>
                {p.label}
              </option>
            ))}
          </select>
        </Campo>

        <Campo rotulo="Situação do processo">
          <select
            name="status"
            defaultValue={processo.status}
            className="campo"
          >
            {STATUS.map((s) => (
              <option key={s.valor} value={s.valor}>
                {s.label}
              </option>
            ))}
          </select>
        </Campo>

        <Campo rotulo="Observações" full>
          <textarea
            name="observacoes"
            defaultValue={processo.observacoes ?? ""}
            rows={3}
            className="campo"
          />
        </Campo>

        <div className="flex gap-3 pt-1 sm:col-span-2">
          {podeEditar && (
            <BotaoEnviar className="botao-primario h-[42px]">
              Salvar processo
            </BotaoEnviar>
          )}
          <Link
            href="/processos"
            className="flex h-[42px] items-center rounded-lg border border-tint-3 bg-white px-4 text-sm font-medium"
          >
            {podeEditar ? "Cancelar" : "Voltar"}
          </Link>
        </div>
        </fieldset>
      </form>

      {podeExcluir && <BlocoExcluir id={processo.id} />}
    </div>
  );
}
