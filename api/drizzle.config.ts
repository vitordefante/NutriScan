import { defineConfig } from 'drizzle-kit';

// Carrega o .env local quando existir (em produção as variáveis vêm do provedor).
try {
  process.loadEnvFile();
} catch {
  // sem .env: segue com as variáveis do ambiente
}

// `db:generate` só lê o schema e não precisa do banco; `db:migrate` precisa (e o drizzle-kit
// avisa se a URL faltar). Por isso a URL não é exigida aqui.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
});
