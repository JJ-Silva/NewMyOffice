// Layout das telas de entrada (login, cadastro, troca de escritório).
// Cartão centrado sobre o fundo da app.

export default function LayoutAuth({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="text-2xl font-semibold tracking-tight text-acento">
            MyOffice
          </span>
          <p className="mt-1 text-sm text-texto-secundario">
            Prazos calculados, conferidos e sempre à vista.
          </p>
        </div>
        <div className="rounded-xl border border-tint-2 bg-superficie p-6 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
