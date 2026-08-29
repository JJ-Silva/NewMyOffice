import { defineConfig } from "vitest/config";

// Testes de lógica pura (lib/domain) e de dados (lib/db).
// Rodar: npm test  |  npm run test:watch
export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "tests/**/*.test.ts"],
  },
});
