// Tela de entrada — vitrine teal à esquerda, cartão de formulário à direita
// (porte do protótipo). Em telas estreitas, só o cartão aparece.

export default function LayoutAuth({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="login-grid">
      <div className="login-vitrine">
        <div className="flex items-center gap-2.5">
          <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-lg bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.ico" alt="" className="h-6 w-6 object-contain" />
          </span>
          <span className="text-[17px] font-semibold tracking-tight">
            MyOffice
          </span>
        </div>

        <div className="flex max-w-[420px] flex-col gap-[22px]">
          <h2 className="text-[30px] font-semibold leading-[1.25] tracking-[-0.02em]">
            Prazos calculados, conferidos e sempre à vista.
          </h2>
          <p className="text-sm leading-[1.65] text-white/70">
            O MyOffice apura prazo fatal e prazo interno a partir da data de
            disponibilização, considerando feriados e suspensões — e registra a
            memória de cálculo de cada lançamento.
          </p>
          <ul className="flex flex-col gap-3 pt-2">
            {[
              "Contagem em dias úteis com base legal citada",
              "Ajuste manual sempre com motivo registrado",
              "Histórico completo por prazo",
            ].map((item) => (
              <li
                key={item}
                className="flex items-center gap-2.5 text-[13px] text-white/80"
              >
                <span className="h-1.5 w-1.5 flex-none rounded-full bg-cumprido" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <span className="text-xs text-white/45">
          Uso interno do escritório · versão 1.0
        </span>
      </div>

      <div className="flex items-center justify-center p-10">
        <div className="login-cartao">{children}</div>
      </div>
    </div>
  );
}
