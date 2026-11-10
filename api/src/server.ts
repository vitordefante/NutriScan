import { buildApp } from './app.js';
import { loadEnv } from './config/env.js';
import { createDb } from './db/client.js';

const env = loadEnv();
const database = createDb(env.DATABASE_URL, {
  // `app` é usado só quando o erro acontece — muito depois de ter sido criado logo abaixo.
  onConnectionError: (err) => app.log.error({ err }, 'Conexão com o banco perdida'),
});

const app = buildApp({ pingDb: database.ping }, { logger: true });
app.addHook('onClose', () => database.close());

// Encerra com elegância (Ctrl+C ou parada do servidor na nuvem).
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void app.close().then(() => process.exit(0));
  });
}

try {
  await app.listen({ port: env.PORT, host: env.HOST });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
