import { describe, expect, it } from 'vitest';

import { prepararAlimento } from './alimento.js';
import type { DadosAlimento } from './dados-alimento.js';

const preparar = (campos: Partial<DadosAlimento>) =>
  prepararAlimento({
    nome: 'Produto',
    categorias: [],
    selos: [],
    aditivos: [],
    nutrientes: {},
    ...campos,
  });

describe('prepararAlimento', () => {
  it('limpa a lista de ingredientes uma vez (sem acentos e sem frases que não são ingredientes)', () => {
    const a = preparar({ ingredientes: 'Açúcar, CACAU. Sem glúten. ALÉRGICOS: contém leite.' });
    expect(a.textoIngredientes).toBe('acucar, cacau. . ');
    expect(a.temIngredientes).toBe(true);
  });

  it('lista só com frases conta como sem ingredientes', () => {
    expect(preparar({ ingredientes: 'Sem glúten. Sem conservantes.' }).temIngredientes).toBe(false);
  });

  describe('bebida ou sólido', () => {
    it.each<[caso: string, campos: Partial<DadosAlimento>, bebida: boolean]>([
      ['embalagem em ml', { quantidade: '350 ml' }, true],
      ['embalagem em litros', { quantidade: '1 L' }, true],
      ['embalagem em gramas', { quantidade: '395 g' }, false],
      ['categoria de bebidas sem quantidade', { categorias: ['en:beverages'] }, true],
      ['pó para preparo', { categorias: ['en:beverages', 'en:instant-beverages'] }, false],
      [
        'categoria "plant-based-foods-and-beverages"',
        { categorias: ['en:plant-based-foods-and-beverages'] },
        false,
      ],
      [
        'sorvete em litros (categoria)',
        { quantidade: '1,5 L', categorias: ['en:ice-creams'] },
        false,
      ],
      ['sorvete em litros (nome)', { nome: 'Sorvete Napolitano', quantidade: '2 L' }, false],
    ])('%s', (_caso, campos, esperado) => {
      expect(preparar(campos).bebida).toBe(esperado);
    });
  });
});
