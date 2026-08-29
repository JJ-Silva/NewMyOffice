# MyOffice

Sistema de gestão para escritório de advocacia. Começa pelo controle de prazos.

- **Especificação:** [`docs/MYOFFICE_MVP_PLANO.md`](docs/MYOFFICE_MVP_PLANO.md)
- **Roteiro da 1ª entrega:** [`INICIO-AQUI.md`](INICIO-AQUI.md)
- **Regras de código:** [`CLAUDE.md`](CLAUDE.md)

## Rodar local

```bash
npm install
npm run db:start          # Supabase local (precisa de Docker)
cp .env.local.example .env.local   # e preencher com os valores que o db:start imprime
npm run db:reset          # aplica migrations + seed
npm run dev               # http://localhost:3000
```

## Testes

```bash
npm test                  # lib/domain + tests/
npm run test:watch
```

## Stack
Next.js 16 (App Router) · Supabase · Vercel · TypeScript · Vitest · Tailwind.
