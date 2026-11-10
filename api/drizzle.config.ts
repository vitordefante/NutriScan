import { defineConfig } from 'drizzle-kit';

// Carrega o .env local quando existir (em produção as variáveis vêm do provedor).
try {
  process.loadEnvFile();
} catch {
  // sem .env: segue com as variáveis do ambiente
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL não definida');
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL },
});
