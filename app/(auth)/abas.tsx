import Link from "next/link";

// Alternador "Entrar / Criar conta" no topo do cartão. São rotas separadas
// (/login e /cadastro) — a aba ativa é passada por prop.

export function AbasAuth({ ativa }: { ativa: "login" | "cadastro" }) {
  return (
    <div className="abas mb-[26px]">
      <Link href="/login" className="aba" data-ativa={ativa === "login"}>
        Entrar
      </Link>
      <Link href="/cadastro" className="aba" data-ativa={ativa === "cadastro"}>
        Criar conta
      </Link>
    </div>
  );
}
