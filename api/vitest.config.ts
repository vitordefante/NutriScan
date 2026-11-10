import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Só os testes do código-fonte (nunca as cópias compiladas em dist/).
    include: ['src/**/*.test.ts'],
  },
});
