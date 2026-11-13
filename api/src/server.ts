import { buildApp } from './app.js';
import { loadEnv } from './config/env.js';
import { createDb } from './db/client.js';
import { criarClienteObf, criarClienteOff } from './modules/produtos/open-food-facts.client.js';
import { criarCacheProdutosPg } from './modules/produtos/produtos.repository.js';
import { criarServicoProdutos } from './modules/produtos/produtos.service.js';
import { criarRepositorioRotulosPg } from './modules/rotulo/rotulos.repository.js';

const env = loadEnv();
const database = createDb(env.DATABASE_URL, {
  // `app` é usado só quando o erro acontece — muito depois de ter sido criado logo abaixo.
  onConnectionError: (err) => app.log.error({ err }, 'Conexão com o banco perdida'),
});

const produtos = criarServicoProdutos({
  off: criarClienteOff(),
  obf: criarClienteObf(),
  cache: criarCacheProdutosPg(database.db),
  rotulos: criarRepositorioRotulosPg(database.db),
  log: { warn: (obj, msg) => app.log.warn(obj, msg) },
});

const app = buildApp({ pingDb: database.ping, produtos }, { logger: true });
app.addHook('onClose', () => database.close());

// Encerra com elegância (Ctrl+C ou parada do servidor na nuvem).
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    // Se algo travar no encerramento, força a saída em 10s para não depender de SIGKILL.
    setTimeout(() => process.exit(1), 10_000).unref();
    void app.close().then(() => process.exit(0));
  });
}

try {
  await app.listen({ port: env.PORT, host: env.HOST });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
