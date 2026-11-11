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

  it('ignora tags em português (texto livre)', () => {
    expect(subtipoDasCategorias(['en:breads', 'pt:Processado'])).toBe('Pão');
  });

  it('não inventa subtipo quando nenhuma categoria é conhecida', () => {
    expect(subtipoDasCategorias(['en:dairies', 'en:fermented-foods'])).toBeUndefined();
    expect(subtipoDasCategorias([])).toBeUndefined();
  });
});
