import { describe, expect, it } from 'vitest';

import { buildApp } from '../../app.js';

describe('GET /health', () => {
  it('responde 200 quando o banco está acessível', async () => {
    const app = buildApp({ pingDb: async () => {} });

    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok', db: 'ok' });
  });

  it('responde 503 quando o banco não responde', async () => {
    const app = buildApp({
      pingDb: async () => {
        throw new Error('conexão recusada');
      },
    });

    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ status: 'degradado', db: 'erro' });
  });
});
