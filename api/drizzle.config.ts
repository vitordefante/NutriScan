import { defineConfig } from 'drizzle-kit';

// Carrega o .env local quando existir (em produção as variáveis vêm do provedor).
try {
  process.loadEnvFile();
} catch {
  // sem .env: segue com as variáveis do ambiente
}

// `generate` só lê o schema e não precisa do banco. Os demais comandos (migrate, push, studio)
// precisam: sem a URL, falham aqui com uma mensagem clara, em vez de o driver tentar um banco
// padrão (localhost/variáveis PG*) e aplicar migrações no lugar errado.
const soGeraMigracao = process.argv.includes('generate');
if (!soGeraMigracao && !process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL não definida');
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
});
