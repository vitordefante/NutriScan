import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3333),
  HOST: z.string().default('0.0.0.0'),
  // Não usa z.url(): ela recusa o formato com socket Unix usado por provedores de nuvem
  // (ex.: postgres://u:p@/db?host=/cloudsql/...). Basta exigir o protocolo do Postgres.
  DATABASE_URL: z
    .string()
    .regex(/^postgres(ql)?:\/\//, 'deve começar com postgres:// ou postgresql://'),
  /**
   * Só em desenvolvimento: pasta onde cada envio de rótulo (texto do OCR + o que foi lido) é
   * guardado em JSON, para reproduzir leituras que deram errado. Fora do Git.
   */
  OCR_DEBUG_DIR: z.string().optional(),
  /**
   * Segredo que assina os tokens de login (JWT). Longo e aleatório; nunca vai para o Git.
   * Gerar com: node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   */
  JWT_SECRET: z.string().min(32, 'deve ter pelo menos 32 caracteres'),
  /**
   * Quantos proxies confiáveis ficam na frente da API (o balanceador do provedor de nuvem: 1).
   * Sem isso, atrás de um proxy todo mundo tem o mesmo IP e divide o mesmo limite de pedidos.
   * Em desenvolvimento fica vazio: confiar no cabeçalho deixaria qualquer um trocar de IP.
   */
  TRUST_PROXY: z.coerce.number().int().min(1).optional(),
});

export type Env = z.infer<typeof envSchema>;

/** Valida as variáveis de ambiente na inicialização: se faltar algo, a API nem sobe. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    throw new Error(`Variáveis de ambiente inválidas:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
