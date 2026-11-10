import { describe, expect, it } from 'vitest';

import { paraDadosAlimento, paraProduto, produtoOffSchema } from './open-food-facts.mapper.js';

const off = (campos: Record<string, unknown>) =>
  produtoOffSchema.parse({ code: '7890000000000', ...campos });

describe('paraDadosAlimento', () => {
  it('converte nutrientes (sódio de g para mg) e normaliza códigos de aditivos', () => {
    const d = paraDadosAlimento(
      off({
        product_name: 'Biscoito',
        additives_tags: ['en:e341i', 'en:e322'],
        nova_group: 4,
        nutriscore_grade: 'd',
        nutriments: {
          'energy-kcal_100g': 470,
          sugars_100g: 30,
          'saturated-fat_100g': 7,
          sodium_100g: 0.25,
        },
      }),
    );
    expect(d).toMatchObject({
      aditivos: ['e341i', 'e322'],
      novaInformada: 4,
      nutriScoreInformado: 'D',
      nutrientes: { energiaKcal: 470, acucares: 30, gorduraSaturada: 7, sodioMg: 250 },
    });
  });

  it('calcula o sódio pelo sal e a energia pelos kJ quando faltam', () => {
    const d = paraDadosAlimento(off({ nutriments: { salt_100g: 1, energy_100g: 418.4 } }));
    expect(d.nutrientes.sodioMg).toBeCloseTo(400);
    expect(d.nutrientes.energiaKcal).toBeCloseTo(100);
  });

  it('descarta valores inválidos e letras como "unknown" e "not-applicable"', () => {
    const d = paraDadosAlimento(
      off({
        nova_group: 'x',
        nutriscore_grade: 'not-applicable',
        nutriments: { sugars_100g: 'abc', fiber_100g: -1, proteins_100g: '3.5' },
      }),
    );
    expect(d.novaInformada).toBeUndefined();
    expect(d.nutriScoreInformado).toBeUndefined();
    expect(d.nutrientes).toEqual({ proteinas: 3.5 });
  });

  it('usa só a lista de ingredientes em português', () => {
    expect(
      paraDadosAlimento(off({ ingredients_text: 'Sucre, arôme' })).ingredientes,
    ).toBeUndefined();
  });
});

describe('paraProduto', () => {
  it('usa a primeira marca e um nome padrão quando falta o nome', () => {
    expect(paraProduto(off({ brands: 'Nestlé, Moça' }))).toMatchObject({
      nome: 'Produto sem nome',
      marca: 'Nestlé',
      tipo: 'alimento',
    });
  });
});
