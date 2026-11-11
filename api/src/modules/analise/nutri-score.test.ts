import { describe, expect, it } from 'vitest';

import { alimento } from './__fixtures__/alimentos.js';
import { avaliarNutriScore } from './nutri-score.js';

const feijao = {
  energiaKcal: 205,
  acucares: 0,
  gorduraSaturada: 0,
  sodioMg: 13,
  fibras: 41.7,
  proteinas: 18.3,
};

describe('avaliarNutriScore', () => {
  it('calcula pela tabela nutricional (alimento sólido)', () => {
    expect(avaliarNutriScore(alimento({ nutrientes: feijao, quantidade: '1kg' }), false)).toEqual({
      letra: 'A',
      origem: 'calculado',
    });
  });

  it('achocolatado em pó: muito açúcar → D', () => {
    const nescau = {
      energiaKcal: 365,
      acucares: 75,
      gorduraSaturada: 0,
      sodioMg: 50,
      fibras: 4.5,
      proteinas: 3,
    };
    expect(
      avaliarNutriScore(alimento({ nutrientes: nescau, quantidade: '370 g' }), false)?.letra,
    ).toBe('D');
  });

  it('usa a tabela de bebidas quando a embalagem está em ml', () => {
    const cola = { energiaKcal: 44, acucares: 11, gorduraSaturada: 0, sodioMg: 5 };
    expect(
      avaliarNutriScore(alimento({ nutrientes: cola, quantidade: '220 mL' }), false)?.letra,
    ).toBe('E');
  });

  it('adoçante piora a nota de bebidas', () => {
    const zero = { energiaKcal: 0, acucares: 0, gorduraSaturada: 0, sodioMg: 10 };
    const bebida = alimento({ nutrientes: zero, quantidade: '350 ml' });
    expect(avaliarNutriScore(bebida, false)?.letra).toBe('B');
    expect(avaliarNutriScore(bebida, true)?.letra).toBe('C');
  });

  it('"plant-based-foods-and-beverages" não faz o alimento virar bebida', () => {
    // Regressão: com a tabela de bebidas, o feijão saía com B em vez de A.
    const r = avaliarNutriScore(
      alimento({ nutrientes: feijao, categorias: ['en:plant-based-foods-and-beverages'] }),
      false,
    );
    expect(r?.letra).toBe('A');
  });

  it('usa a letra da fonte quando falta dado na tabela', () => {
    const r = avaliarNutriScore(
      alimento({ nutrientes: { energiaKcal: 300 }, nutriScoreInformado: 'C' }),
      false,
    );
    expect(r).toEqual({ letra: 'C', origem: 'fonte' });
  });

  it('usa a letra da fonte em categorias com regra própria (queijos)', () => {
    const r = avaliarNutriScore(
      alimento({ nutrientes: feijao, categorias: ['en:cheeses'], nutriScoreInformado: 'D' }),
      false,
    );
    expect(r).toEqual({ letra: 'D', origem: 'fonte' });
  });

  it('null sem tabela e sem letra informada', () => {
    expect(avaliarNutriScore(alimento(), false)).toBeNull();
  });
});

describe('avaliarNutriScore — achados da revisão', () => {
  const agua = { energiaKcal: 0, acucares: 0, gorduraSaturada: 0, sodioMg: 2 };

  it('água mineral recebe A', () => {
    const r = avaliarNutriScore(
      alimento({
        nutrientes: agua,
        quantidade: '500 ml',
        categorias: ['en:beverages', 'en:waters', 'en:mineral-waters'],
      }),
      false,
    );
    expect(r).toEqual({ letra: 'A', origem: 'calculado' });
  });

  it('água saborizada não recebe A', () => {
    const r = avaliarNutriScore(
      alimento({
        nutrientes: agua,
        quantidade: '500 ml',
        categorias: ['en:waters', 'en:flavoured-waters'],
      }),
      true,
    );
    expect(r?.letra).not.toBe('A');
  });

  it('"doughnuts" e "coconuts" não são tratados como oleaginosas: a nota é calculada', () => {
    const donut = { energiaKcal: 420, acucares: 25, gorduraSaturada: 9, sodioMg: 300 };
    const r = avaliarNutriScore(
      alimento({ nutrientes: donut, categorias: ['en:doughnuts'] }),
      false,
    );
    expect(r?.origem).toBe('calculado');
  });
});
