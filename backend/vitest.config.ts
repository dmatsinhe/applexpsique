import { defineConfig } from "vitest/config";

// Todos os testes de integração partilham a mesma base Postgres real e
// mutam invariantes globais entre ficheiros (ex.: "só uma versão ativa por
// objetivo clínico" — vários ficheiros de teste usam o mesmo ClinicalGoal
// como objetivo descartável). Corridas de ficheiros em paralelo podiam
// interferir umas com as outras de forma instável. Correr em série é mais
// lento mas determinístico.
export default defineConfig({
  test: {
    fileParallelism: false,
  },
});
