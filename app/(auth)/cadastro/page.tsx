import { AbasAuth } from "../abas";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { CampoSenha } from "@/components/CampoSenha";
import { criarConta } from "./acoes";

export default async function PaginaCadastro({
  searchParams,
}: PageProps<"/cadastro">) {
  const params = await searchParams;
  const erro = typeof params.erro === "string" ? params.erro : null;

  return (
    <div>
      <AbasAuth ativa="cadastro" />

      <h1 className="mb-1.5 text-2xl font-semibold tracking-[-0.02em]">
        Criar conta
      </h1>
      <p className="mb-[26px] text-sm leading-[1.55] text-texto-secundario">
        Comece a controlar os prazos do escritório.
      </p>

      {erro && (
        <p className="mb-4 rounded-lg border border-atrasado bg-[var(--atrasado-fundo)] px-3 py-2 text-sm text-atrasado">
          {erro}
        </p>
      )}

      <form action={criarConta} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="rotulo">Como devo te chamar?</span>
          <input
            type="text"
            name="nome"
            required
            autoComplete="name"
            placeholder="Seu nome"
            className="campo h-10"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="rotulo">Nome do escritório</span>
          <input
            type="text"
            name="nome_escritorio"
            required
            placeholder="Ex.: Silva & Associados"
            className="campo h-10"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="rotulo">E-mail</span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="voce@escritorio.adv.br"
            className="campo h-10"
          />
        </label>

        <CampoSenha
          name="senha"
          label="Senha"
          minLength={6}
          placeholder="pelo menos 6 caracteres"
        />
        <CampoSenha name="confirmar" label="Repita a senha" minLength={6} />

        <p className="-mt-0.5 text-xs leading-[1.5] text-texto-secundario">
          O escritório é criado automaticamente com sua conta como sócio
          fundador.
        </p>

        <BotaoEnviar
          className="botao-primario mt-1 h-[42px]"
          rotuloOcupado="Criando…"
        >
          Criar escritório
        </BotaoEnviar>
      </form>
    </div>
  );
}
