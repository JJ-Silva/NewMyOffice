import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Testes de lógica pura (lib/domain) e de dados (lib/db).
// Rodar: npm test  |  npm run test:watch
export default defineConfig({
  resolve: {
    // Mesmo alias do tsconfig ("@/*" → raiz do projeto).
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "tests/**/*.test.ts"],
  },
});
