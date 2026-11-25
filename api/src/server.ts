import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildApp } from './app.js';
import { loadEnv } from './config/env.js';
import { createDb } from './db/client.js';
import { criarServicoAlternativas } from './modules/alternativas/alternativas.service.js';
import { criarCacheBuscasPg } from './modules/alternativas/buscas.repository.js';
import { criarRepositorioContaProdutorPg } from './modules/conta-produtor/conta-produtor.repository.js';
import { criarServicoContaProdutor } from './modules/conta-produtor/conta-produtor.service.js';
import { criarRepositorioContasPg } from './modules/contas/contas.repository.js';
import { criarServicoContas } from './modules/contas/contas.service.js';
import { criarRepositorioHistoricoPg } from './modules/historico/historico.repository.js';
import { criarRepositorioProdutoresPg } from './modules/produtores/produtores.repository.js';
import { criarClienteObf, criarClienteOff } from './modules/produtos/open-food-facts.client.js';
import { criarCacheProdutosPg } from './modules/produtos/produtos.repository.js';
import { criarServicoProdutos } from './modules/produtos/produtos.service.js';
import { criarRepositorioRegistrosPg } from './modules/registros/registros.repository.js';
import { criarServicoRegistros } from './modules/registros/registros.service.js';
import { criarRepositorioRotulosPg } from './modules/rotulo/rotulos.repository.js';

const env = loadEnv();
const database = createDb(env.DATABASE_URL, {
  // `app` é usado só quando o erro acontece — muito depois de ter sido criado logo abaixo.
  onConnectionError: (err) => app.log.error({ err }, 'Conexão com o banco perdida'),
});

const off = criarClienteOff();
const obf = criarClienteObf();
const rotulos = criarRepositorioRotulosPg(database.db);
const log = { warn: (obj: object, msg: string) => app.log.warn(obj, msg) };

const produtos = criarServicoProdutos({
  off,
  obf,
  cache: criarCacheProdutosPg(database.db),
  rotulos,
  ...(env.OCR_DEBUG_DIR &&
    env.NODE_ENV !== 'production' && {
      // Diagnóstico: grava em segundo plano e nunca derruba o envio. Caminho relativo à pasta
      // da API (não ao diretório de onde ela foi iniciada), coberto pelo .gitignore.
      registrarEnvio: (barcode, envio, leitura) => {
        const pasta = resolve(dirname(fileURLToPath(import.meta.url)), '..', env.OCR_DEBUG_DIR!);
        const arquivo = join(
          pasta,
          `${barcode}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
        );
        mkdir(pasta, { recursive: true })
          .then(() => writeFile(arquivo, JSON.stringify({ barcode, envio, leitura }, null, 1)))
          .catch((err: unknown) => app.log.warn({ err }, 'Falha ao guardar o OCR do envio'));
      },
    }),
  log,
});

const alternativas = criarServicoAlternativas({
  produtos,
  busca: { open_food_facts: off, open_beauty_facts: obf },
  cache: criarCacheBuscasPg(database.db),
  rotulos,
  log,
});

const app = buildApp(
  {
    pingDb: database.ping,
    produtos,
    alternativas,
    contas: criarServicoContas(criarRepositorioContasPg(database.db)),
    historico: criarRepositorioHistoricoPg(database.db),
    registros: criarServicoRegistros({
      produtos,
      registros: criarRepositorioRegistrosPg(database.db),
    }),
    produtores: criarRepositorioProdutoresPg(database.db),
    contaProdutor: criarServicoContaProdutor(criarRepositorioContaProdutorPg(database.db)),
    jwtSecret: env.JWT_SECRET,
  },
  {
    logger: {
      // O token de login nunca aparece nos logs.
      redact: ['req.headers.authorization'],
    },
    // O IP real do cliente (limites por endereço) vem do X-Forwarded-For do proxy da nuvem.
    // Confia só nos N saltos mais próximos (`true` pegaria o primeiro endereço do cabeçalho,
    // que o próprio cliente pode inventar).
    ...(env.TRUST_PROXY && {
      trustProxy: (_endereco: string, salto: number) => salto < env.TRUST_PROXY!,
    }),
  },
);
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
