import type { LogEntry, LogNutrition, NutritionFacts } from '@nutriscan/shared';
import { describe, expect, it } from 'vitest';

import { nutricaoConsumida, resumirNutricao } from './consumo.js';

const FEIJAO: NutritionFacts = {
  unidade: 'g',
  por100: { energiaKcal: 330, carboidratos: 60, proteinas: 20, gorduras: 1.5, fibras: 20 },
  porcao: 60,
  micronutrientes: [{ id: 'ferro', nome: 'Ferro', quantidade: 7, unidade: 'mg', vdr: 14 }],
  tipicos: {
    alimento: 'Feijão, preto, cru',
    itens: [{ id: 'magnesio', nome: 'Magnésio', quantidade: 188, unidade: 'mg', vdr: 420 }],
  },
};

describe('nutricaoConsumida', () => {
  it('sem quantidade, vale uma porção do rótulo', () => {
    expect(nutricaoConsumida(FEIJAO)).toEqual({
      quantidade: 60,
      unidade: 'g',
      porcao: 60,
      macros: { energiaKcal: 198, carboidratos: 36, proteinas: 12, gorduras: 0.9, fibras: 12 },
      micros: { ferro: 4.2 },
      estimados: { magnesio: 113 },
    } satisfies LogNutrition);
  });

  it('com quantidade, multiplica por ela; sem porção no rótulo, o padrão é 100 g', () => {
    expect(nutricaoConsumida(FEIJAO, 150).macros.carboidratos).toBe(90);
    const semPorcao = { ...FEIJAO, porcao: undefined } as NutritionFacts;
    delete (semPorcao as { porcao?: number }).porcao;
    expect(nutricaoConsumida(semPorcao)).toMatchObject({ quantidade: 100, micros: { ferro: 7 } });
    expect(nutricaoConsumida(semPorcao)).not.toHaveProperty('porcao');
  });
});

const consumo = (registradoEm: string, nutricao?: LogNutrition): LogEntry => ({
  id: registradoEm,
  barcode: '1',
  tipo: 'alimento',
  nome: 'P',
  nota: 50,
  faixa: 'regular',
  nova: 1,
  altoEm: [],
  alertas: [],
  registradoEm,
  ...(nutricao && { nutricao }),
});

describe('resumirNutricao', () => {
  it('média por dia com registro (horário de Brasília), não pelo período inteiro', () => {
    const porcao = nutricaoConsumida(FEIJAO);
    const resumo = resumirNutricao([
      // 23h de Brasília do dia 14 (02h UTC do dia 15): ainda é dia 14.
      consumo('2026-11-15T02:00:00Z', porcao),
      consumo('2026-11-14T12:00:00Z', porcao),
      consumo('2026-11-16T12:00:00Z', porcao),
      consumo('2026-11-16T13:00:00Z'), // sem tabela: fora da conta
    ]);

    expect(resumo).toEqual({
      registros: 3,
      diasComRegistro: 2, // 14 e 16
      porDia: {
        energiaKcal: 297,
        carboidratos: 54,
        proteinas: 18,
        gorduras: 1.4, // 2,7 / 2 = 1,35
        fibras: 18,
      },
      micros: [
        // Do maior %VD para o menor: ferro 6,3/14 = 45%; magnésio 170/420 = 40%.
        { id: 'ferro', nome: 'Ferro', unidade: 'mg', vdr: 14, quantidade: 6.3, estimado: false },
        {
          id: 'magnesio',
          nome: 'Magnésio',
          unidade: 'mg',
          vdr: 420,
          quantidade: 170,
          estimado: true,
        },
      ],
    });
  });

  it('o mesmo micronutriente declarado num produto e estimado em outro fica marcado como estimado', () => {
    const declarado: LogNutrition = { ...nutricaoConsumida(FEIJAO), estimados: {} };
    const estimado: LogNutrition = {
      ...nutricaoConsumida(FEIJAO),
      micros: {},
      estimados: { ferro: 2 },
    };
    const resumo = resumirNutricao([
      consumo('2026-11-14T12:00:00Z', declarado),
      consumo('2026-11-14T13:00:00Z', estimado),
    ]);
    expect(resumo?.micros).toEqual([
      expect.objectContaining({ id: 'ferro', quantidade: 6.2, estimado: true }),
    ]);
  });

  it('nenhum registro com tabela: null', () => {
    expect(resumirNutricao([consumo('2026-11-14T12:00:00Z')])).toBeNull();
  });
});
