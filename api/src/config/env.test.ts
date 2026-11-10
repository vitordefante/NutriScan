import { describe, expect, it } from 'vitest';

import { loadEnv } from './env.js';

const LOCAL_URL = 'postgres://nutriscan:nutriscan@localhost:5432/nutriscan';

describe('loadEnv', () => {
  it('aplica os valores padrão quando só o DATABASE_URL é informado', () => {
    expect(loadEnv({ DATABASE_URL: LOCAL_URL })).toEqual({
      NODE_ENV: 'development',
      PORT: 3333,
      HOST: '0.0.0.0',
      DATABASE_URL: LOCAL_URL,
    });
  });

  it('converte PORT de texto para número', () => {
    expect(loadEnv({ DATABASE_URL: LOCAL_URL, PORT: '8080' }).PORT).toBe(8080);
  });

  it.each([
    ['postgresql://', 'postgresql://u:p@db.exemplo.com:5432/nutriscan'],
    ['socket Unix (nuvem)', 'postgres://u:p@/nutriscan?host=/cloudsql/projeto:regiao:instancia'],
  ])('aceita URL de Postgres: %s', (_nome, url) => {
    expect(loadEnv({ DATABASE_URL: url }).DATABASE_URL).toBe(url);
  });

  it('recusa URL que não é de Postgres', () => {
    expect(() => loadEnv({ DATABASE_URL: 'http://exemplo.com' })).toThrow(/DATABASE_URL/);
  });

  it('recusa quando o DATABASE_URL está ausente', () => {
    expect(() => loadEnv({})).toThrow(/DATABASE_URL/);
  });
});
