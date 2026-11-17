import type { User } from '@nutriscan/shared';
import { eq } from 'drizzle-orm';

import type { Database } from '../../db/client.js';
import { ehUuid } from '../../db/conversoes.js';
import { usuarios } from '../../db/schema.js';

export type RepositorioContas = {
  /** Cria a conta; null se o e-mail já está em uso. */
  criar: (email: string, senhaHash: string, agora: Date) => Promise<User | null>;
  buscarPorEmail: (email: string) => Promise<{ usuario: User; senhaHash: string } | null>;
  buscarPorId: (id: string) => Promise<User | null>;
  /** Apaga a conta e, em cascata, o histórico e o log dela. */
  excluir: (id: string) => Promise<void>;
};

export function criarRepositorioContasPg(db: Database['db']): RepositorioContas {
  return {
    async criar(email, senhaHash, criadoEm) {
      const [linha] = await db
        .insert(usuarios)
        .values({ email, senhaHash, criadoEm })
        .onConflictDoNothing({ target: usuarios.email })
        .returning({ id: usuarios.id, email: usuarios.email });
      return linha ?? null;
    },

    async buscarPorEmail(email) {
      const [linha] = await db.select().from(usuarios).where(eq(usuarios.email, email)).limit(1);
      return linha
        ? { usuario: { id: linha.id, email: linha.email }, senhaHash: linha.senhaHash }
        : null;
    },

    async buscarPorId(id) {
      // Um id que não é UUID nem chega ao banco (o Postgres recusaria com erro).
      if (!ehUuid(id)) return null;
      const [linha] = await db
        .select({ id: usuarios.id, email: usuarios.email })
        .from(usuarios)
        .where(eq(usuarios.id, id))
        .limit(1);
      return linha ?? null;
    },

    async excluir(id) {
      await db.delete(usuarios).where(eq(usuarios.id, id));
    },
  };
}
