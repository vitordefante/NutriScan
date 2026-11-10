import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

import * as schema from './schema.js';

type CreateDbOptions = {
  /** Chamado quando uma conexão ociosa cai (ex.: banco reiniciou). */
  onConnectionError: (err: Error) => void;
};

export function createDb(databaseUrl: string, { onConnectionError }: CreateDbOptions) {
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    // Limites de tempo: sem eles, um banco travado (sem recusar a conexão) prende
    // as requisições por minutos — até o timeout do sistema operacional.
    connectionTimeoutMillis: 5_000,
    query_timeout: 10_000,
  });
  // Sem este listener, o Node encerra a API inteira quando o banco derruba uma conexão ociosa.
  // O pool descarta a conexão quebrada sozinho e abre outra no próximo uso.
  pool.on('error', onConnectionError);

  const db = drizzle(pool, { schema });

  return {
    db,
    /** Lança erro se o banco não responder. */
    ping: async () => {
      await db.execute(sql`select 1`);
    },
    close: () => pool.end(),
  };
}

export type Database = ReturnType<typeof createDb>;
