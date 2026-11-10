import { describe, expect, it } from 'vitest';

import { alimento } from './__fixtures__/alimentos.js';
import { detectarAditivos, GRUPOS_ADITIVOS } from './aditivos.js';

const ids = (campos: Parameters<typeof alimento>[0]) =>
  detectarAditivos(alimento(campos)).map((g) => g.id);

describe('detectarAditivos', () => {
  it('detecta pelos códigos informados, incluindo variantes (e341i)', () => {
    expect(ids({ aditivos: ['e250', 'e341i'] })).toEqual(['nitritos-nitratos', 'fosfatos']);
  });

  it('detecta pelos nomes escritos no rótulo', () => {
    expect(
      ids({ ingredientes: 'Água, açúcar, corante caramelo IV, acidulante ácido fosfórico' }),
    ).toEqual(['caramelo-amonico', 'fosfatos']);
  });

  it('vários aditivos do mesmo grupo contam como um grupo só', () => {
    expect(ids({ aditivos: ['e339', 'e450', 'e452'] })).toEqual(['fosfatos']);
  });

  it('"mononitrato de tiamina" (vitamina B1) não é nitrato', () => {
    // Regressão: o protótipo descontava 8 pontos de um achocolatado por causa da vitamina B1.
    expect(ids({ ingredientes: 'Aveia, vitaminas (mononitrato de tiamina, riboflavina)' })).toEqual(
      [],
    );
  });

  it('"e1500" não é variante de "e150"', () => {
    expect(ids({ aditivos: ['e1500'] })).toEqual([]);
  });

  it('aditivos fora da lista não são detectados (lecitina, ácido cítrico)', () => {
    expect(ids({ aditivos: ['e322', 'e330'] })).toEqual([]);
  });

  it('todo grupo tem motivo e fonte (exigência da metodologia)', () => {
    for (const g of GRUPOS_ADITIVOS) {
      expect(g.motivo, g.id).not.toBe('');
      expect(g.fonte, g.id).not.toBe('');
    }
  });
});
