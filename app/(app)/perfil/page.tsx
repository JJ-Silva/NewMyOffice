import { exigirSessao } from "@/lib/supabase/sessao";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { CampoSenha } from "@/components/CampoSenha";
import { salvarNome, alterarSenha } from "./acoes";

export default async function PaginaPerfil({
  searchParams,
}: PageProps<"/perfil">) {
  const sessao = await exigirSessao();
  const sp = await searchParams;
  const erro = typeof sp.erro === "string" ? sp.erro : null;
  const salvo = sp.salvo === "1";
  const senhaTrocada = sp.senha === "1";

  return (
    <div className="flex max-w-[520px] flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="titulo-pagina">Meu perfil</h1>
        <p className="subtitulo-pagina">
          {sessao.membro.rotulo_nome
            ? `${sessao.membro.rotulo_nome} · `
            : ""}
          {sessao.escritorioNome}
        </p>
      </div>

      {erro && (
        <p className="rounded-lg border border-atrasado bg-[var(--atrasado-fundo)] px-3 py-2 text-sm text-atrasado">
          {erro}
        </p>
      )}
      {salvo && (
        <p className="rounded-lg border border-cumprido bg-[#F0FDF4] px-3.5 py-2.5 text-sm text-[#166534]">
          Nome atualizado.
        </p>
      )}
      {senhaTrocada && (
        <p className="rounded-lg border border-cumprido bg-[#F0FDF4] px-3.5 py-2.5 text-sm text-[#166534]">
          Senha trocada.
        </p>
      )}

      <form action={salvarNome} className="card flex flex-col gap-3 p-5">
        <span className="text-sm font-semibold">Nome</span>
        <label className="flex flex-col gap-1.5">
          <span className="rotulo">Como devo te chamar?</span>
          <input
            name="nome"
            required
            defaultValue={sessao.usuario.nome}
            autoComplete="name"
            className="campo"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="rotulo">E-mail (não muda por aqui)</span>
          <input
            value={sessao.usuario.email}
            readOnly
            className="campo bg-tint-1 text-texto-secundario"
          />
        </label>
        <BotaoEnviar className="botao-primario h-[38px] self-start">
          Salvar nome
        </BotaoEnviar>
      </form>

      <form action={alterarSenha} className="card flex flex-col gap-3 p-5">
        <span className="text-sm font-semibold">Trocar senha</span>
        <CampoSenha
          name="senha"
          label="Nova senha"
          minLength={6}
          placeholder="pelo menos 6 caracteres"
        />
        <CampoSenha name="confirmar" label="Repita a nova senha" minLength={6} />
        <BotaoEnviar className="botao-primario h-[38px] self-start">
          Trocar senha
        </BotaoEnviar>
      </form>
    </div>
  );
}
