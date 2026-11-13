import { describe, expect, it } from 'vitest';

import { subtipoDasCategorias } from './subtipo.js';

describe('subtipoDasCategorias', () => {
  it('usa a categoria mais específica que conhece', () => {
    expect(
      subtipoDasCategorias([
        'en:snacks',
        'en:biscuits',
        'en:chocolate-biscuits',
        'en:filled-biscuits',
      ]),
    ).toBe('Biscoito recheado');
  });

  it('pula categorias desconhecidas no fim da lista', () => {
    expect(
      subtipoDasCategorias(['en:beverages', 'en:sodas', 'en:colas', 'en:sweetened-beverages']),
    ).toBe('Refrigerante');
  });

  it('dá prioridade a categorias precisas mesmo fora de ordem (creme de leite real)', () => {
    expect(
      subtipoDasCategorias([
        'en:dairies',
        'en:creams',
        'en:milks-liquid-and-powder',
        'en:milks',
        'pt:creme de leite',
      ]),
    ).toBe('Creme de leite');
  });

  it('categoria genérica não vence uma mais específica que veio depois dela', () => {
    expect(subtipoDasCategorias(['en:dairies', 'en:milks', 'en:creams', 'en:butters'])).toBe(
      'Manteiga',
    );
  });

  it('usa a categoria genérica quando é a única conhecida (leite UHT real)', () => {
    expect(subtipoDasCategorias(['en:dairies', 'en:milks', 'en:uht-milks', 'en:whole-milks'])).toBe(
      'Leite',
    );
  });

  it('ignora tags em português (texto livre)', () => {
    expect(subtipoDasCategorias(['en:breads', 'pt:Processado'])).toBe('Pão');
  });

  it('não inventa subtipo quando nenhuma categoria é conhecida', () => {
    expect(subtipoDasCategorias(['en:dairies', 'en:fermented-foods'])).toBeUndefined();
    expect(subtipoDasCategorias([])).toBeUndefined();
  });
});
