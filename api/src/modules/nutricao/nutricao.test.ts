import { describe, expect, it } from 'vitest';

import type { DadosAlimento } from '../analise/dados-alimento.js';
import { paraDadosAlimento, produtoOffSchema } from '../produtos/open-food-facts.mapper.js';
import { microsDoOff } from './micronutrientes.js';
import { alimentoTacoDe, montarNutricao } from './nutricao.js';

const alimento = (d: Partial<DadosAlimento>): DadosAlimento => ({
  nome: 'Produto',
  categorias: [],
  selos: [],
  aditivos: [],
  nutrientes: { carboidratos: 60, proteinas: 10, gorduras: 5 },
  ...d,
});

describe('microsDoOff', () => {
  it('converte de gramas (OFF) para mg ou µg e ignora o que não tem VDR', () => {
    expect(
      microsDoOff({
        calcium_100g: 0.0833,
        iron_100g: 0.00833,
        'vitamin-a_100g': 0.0002,
        'vitamin-pp_100g': 0.004,
        calcium_prepared_100g: 0.5,
        'omega-3-fat_100g': 1,
      }),
    ).toEqual({ calcio: 83, ferro: 8.3, vitamina_a: 200, niacina: 4 });
  });

  it('descarta valor absurdo (erro de cadastro) e valor zero', () => {
    // 50 g de cálcio em 100 g: miligramas digitados como gramas.
    expect(microsDoOff({ calcium_100g: 50, iron_100g: 0 })).toEqual({});
  });
});

describe('porção do Open Food Facts', () => {
  const off = (extra: object) => paraDadosAlimento(produtoOffSchema.parse({ code: '1', ...extra }));

  it('sem serving_quantity, calcula pela razão entre o valor da porção e o de 100 g', () => {
    // Feijão real: 17 g de carboidratos na porção, 28,3 g em 100 g → porção de 60 g.
    expect(
      off({ nutriments: { carbohydrates_100g: 28.3333, carbohydrates_serving: 17 } }).porcao,
    ).toBe(60);
  });

  it('usa serving_quantity quando existe; porção absurda fica de fora', () => {
    expect(off({ serving_quantity: 30, nutriments: {} }).porcao).toBe(30);
    expect(
      off({ nutriments: { carbohydrates_100g: 1, carbohydrates_serving: 50 } }).porcao,
    ).toBeUndefined();
  });
});

describe('montarNutricao', () => {
  it('sem carboidratos, proteínas nem gorduras não há o que mostrar', () => {
    expect(montarNutricao(alimento({ nutrientes: { energiaKcal: 300 } }))).toBeUndefined();
  });

  it('bebida em ml; micronutrientes declarados do maior %VD para o menor', () => {
    const n = montarNutricao(
      alimento({
        quantidade: '1 L',
        categorias: ['en:beverages'],
        micronutrientes: { calcio: 120, vitamina_d: 3 },
        porcao: 200,
      }),
    );
    expect(n?.unidade).toBe('ml');
    expect(n?.porcao).toBe(200);
    // Vitamina D: 3/15 = 20% do VDR; cálcio: 120/1000 = 12%.
    expect(n?.micronutrientes.map((m) => m.id)).toEqual(['vitamina_d', 'calcio']);
  });

  it('rótulo lido na foto: a unidade é a da tabela, não o palpite pelo nome', () => {
    // "Açaí cremoso" parece comida pelo nome, mas a tabela da foto é por 100 ml.
    const n = montarNutricao(
      alimento({ nome: 'Açaí cremoso', quantidade: '100 g', unidadeDaTabela: 'ml', porcao: 200 }),
    );
    expect(n?.unidade).toBe('ml');
  });

  it('aveia: micronutrientes típicos pela TACO, só os que passam de 15% do VDR', () => {
    const n = montarNutricao(alimento({ categorias: ['en:cereals', 'en:oats', 'en:rolled-oats'] }));
    expect(n?.tipicos?.alimento).toBe('Aveia, flocos, crua');
    const ids = n?.tipicos?.itens.map((i) => i.id);
    // Tiamina 0,55/1,2 mg (46%), ferro 4,4/14 mg (32%), magnésio 119/420 mg (28%).
    expect(ids).toEqual(expect.arrayContaining(['tiamina', 'ferro', 'magnesio']));
    expect(ids).not.toContain('calcio'); // 48 mg = 5%
    for (const i of n!.tipicos!.itens) expect(i.quantidade / i.vdr).toBeGreaterThanOrEqual(0.15);
  });

  it('leite: a porção (copo de 200 ml) conta para ser fonte de cálcio', () => {
    const leite = { categorias: ['en:milks', 'en:whole-milks'], quantidade: '1 L' };
    const semPorcao = montarNutricao(alimento(leite));
    const comPorcao = montarNutricao(alimento({ ...leite, porcao: 200 }));
    expect(semPorcao?.tipicos?.itens.map((i) => i.id) ?? []).not.toContain('calcio');
    expect(comPorcao?.tipicos?.itens.map((i) => i.id)).toContain('calcio');
  });

  it('o que o rótulo declara não se repete como típico; macros arredondados', () => {
    const n = montarNutricao(
      alimento({
        categorias: ['en:whole-milks'],
        porcao: 200,
        micronutrientes: { calcio: 115 },
        nutrientes: { carboidratos: 4.53333, proteinas: 3.2, gorduras: 3 },
      }),
    );
    expect(n?.micronutrientes.map((m) => m.id)).toEqual(['calcio']);
    expect(n?.tipicos?.itens.map((i) => i.id)).not.toContain('calcio');
    expect(n?.por100.carboidratos).toBe(4.5);
  });
});

describe('alimentoTacoDe', () => {
  it('a categoria mais específica vence (feijão preto também é "common-beans")', () => {
    expect(alimentoTacoDe(['en:common-beans', 'en:black-beans'])?.nome).toBe('Feijão, preto, cru');
    expect(alimentoTacoDe(['en:rices', 'en:brown-rices'])?.nome).toBe('Arroz, integral, cru');
    // Feijão preto só com a etiqueta em português (Camil, 7896006751113).
    expect(alimentoTacoDe(['en:common-beans', 'pt:feijão-preto'])?.nome).toBe('Feijão, preto, cru');
  });

  it('creme de leite, leite condensado e doces não viram "leite" nem "castanha"', () => {
    expect(alimentoTacoDe(['en:milks', 'en:creams'])).toBeUndefined();
    expect(alimentoTacoDe(['en:dairies', 'en:condensed-milks'])).toBeUndefined();
    expect(alimentoTacoDe(['en:cashew-nuts', 'en:chocolate-covered-nuts'])).toBeUndefined();
    expect(alimentoTacoDe(['en:sodas'])).toBeUndefined();
  });

  it('iogurte natural continua simples, mesmo o OFF o pondo em "sobremesas"', () => {
    // Categorias reais do iogurte natural integral Nestlé (7891000072950).
    const iogurte = [
      'en:dairies',
      'en:desserts',
      'en:dairy-desserts',
      'en:yogurts',
      'en:plain-yogurts',
    ];
    expect(alimentoTacoDe(iogurte)?.nome).toBe('Iogurte, natural');
    // "Sem açúcar" não é "adoçado" (o termo vale no começo de uma palavra da tag).
    expect(alimentoTacoDe(['en:natural-yogurts', 'en:unsweetened-yogurts'])?.nome).toBe(
      'Iogurte, natural',
    );
    expect(alimentoTacoDe(['en:natural-yogurts', 'en:sweetened-yogurts'])).toBeUndefined();
    // Sobremesa láctea que não é iogurte natural segue de fora.
    expect(alimentoTacoDe(['en:dairies', 'en:desserts', 'en:yogurts'])).toBeUndefined();
  });
});
