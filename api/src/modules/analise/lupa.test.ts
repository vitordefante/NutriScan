import { describe, expect, it } from 'vitest';

import { alimento } from './__fixtures__/alimentos.js';
import { avaliarLupa, itensPrincipais } from './lupa.js';
import { classificarNova } from './nova.js';

/** Avalia a lupa já com a NOVA calculada, como o motor faz. */
const lupa = (campos: Parameters<typeof alimento>[0]) => {
  const dados = alimento(campos);
  return avaliarLupa(dados, classificarNova(dados));
};

describe('avaliarLupa', () => {
  it('aplica os limites de sólidos (IN 75/2020, Anexo XV)', () => {
    const r = lupa({
      ingredientes: 'Farinha, açúcar, gordura vegetal, sal',
      quantidade: '130 g',
      nutrientes: { acucares: 33, gorduraSaturada: 6, sodioMg: 599 },
    });
    expect(r.altos.map((a) => a.nutriente)).toEqual(['acucar_adicionado', 'gordura_saturada']);
  });

  it('aplica os limites de líquidos', () => {
    const r = lupa({
      ingredientes: 'Água, açúcar',
      quantidade: '1 L',
      nutrientes: { acucares: 7.5, gorduraSaturada: 0, sodioMg: 300 },
    });
    expect(r.altos.map((a) => a.nutriente)).toEqual(['acucar_adicionado', 'sodio']);
  });

  it('estima o açúcar adicionado pelos açúcares totais quando há açúcar nos ingredientes', () => {
    const r = lupa({
      ingredientes: 'Aveia, açúcar mascavo',
      nutrientes: { acucares: 20, gorduraSaturada: 1, sodioMg: 10 },
    });
    expect(r.altos[0]).toMatchObject({ nutriente: 'acucar_adicionado', valor: 20, estimado: true });
  });

  it('sem açúcar nos ingredientes, o açúcar é natural e não conta', () => {
    const r = lupa({
      ingredientes: 'Uva passa, sal',
      nutrientes: { acucares: 60, gorduraSaturada: 0, sodioMg: 10 },
    });
    expect(r.altos).toEqual([]);
  });

  it('descarta açúcar adicionado inconsistente (erro de casa decimal)', () => {
    // Regressão: o OFF registra 4,2 g de açúcar adicionado para 42 g totais, com açúcar como 2º ingrediente.
    const r = lupa({
      ingredientes:
        'Aveia integral moída, açúcar de confeiteiro (açúcar e fécula), cacau, aromatizantes',
      quantidade: '250g',
      nutrientes: { acucares: 42, acucaresAdicionados: 4.2, gorduraSaturada: 1.5, sodioMg: 0 },
    });
    expect(r.altos[0]).toMatchObject({ nutriente: 'acucar_adicionado', valor: 42, estimado: true });
  });

  describe('alimentos dispensados (IN 75/2020, Anexo XVI)', () => {
    it('NOVA 1, como castanhas e amendoim puro', () => {
      expect(
        lupa({
          ingredientes: 'Amendoim torrado',
          nutrientes: { acucares: 4, gorduraSaturada: 9, sodioMg: 5 },
        }).isento,
      ).toBe(true);
    });

    it('leites, mesmo com estabilizantes', () => {
      const r = lupa({
        ingredientes: 'Leite integral e estabilizantes',
        categorias: ['en:uht-milks'],
        nutrientes: { gorduraSaturada: 3.5 },
      });
      expect(r.isento).toBe(true);
    });

    it('queijo sem açúcar nos ingredientes', () => {
      const r = lupa({
        ingredientes: 'Leite, sal e coalho',
        categorias: ['en:cheeses'],
        nutrientes: { gorduraSaturada: 8, sodioMg: 700 },
      });
      expect(r.isento).toBe(true);
    });

    it('mel NÃO é dispensado', () => {
      const r = lupa({
        ingredientes: 'Mel',
        categorias: ['en:honeys'],
        nutrientes: { acucares: 80, gorduraSaturada: 0, sodioMg: 5 },
      });
      expect(r.isento).toBe(false);
      expect(r.altos.map((a) => a.nutriente)).toEqual(['acucar_adicionado']);
    });
  });

  describe('dados faltando', () => {
    it('lista os nutrientes sem dado', () => {
      expect(
        lupa({ ingredientes: 'Farinha, gordura vegetal', nutrientes: { acucares: 2 } }).faltando,
      ).toEqual(['gordura_saturada', 'sodio']);
    });

    it('não cobra o açúcar adicionado quando os açúcares totais já estão abaixo do limite', () => {
      const r = lupa({
        nome: 'Salsicha',
        nutrientes: { acucares: 1, gorduraSaturada: 5, sodioMg: 900 },
      });
      expect(r.faltando).toEqual([]);
    });
  });
});

describe('itensPrincipais', () => {
  it('divide só nas vírgulas fora de parênteses', () => {
    expect(itensPrincipais('a, b (c, d), e [f, g]')).toEqual(['a', 'b (c, d)', 'e [f, g]']);
  });
});
