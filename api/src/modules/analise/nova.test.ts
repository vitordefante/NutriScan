import { describe, expect, it } from 'vitest';

import { alimento } from './__fixtures__/alimentos.js';
import { classificarNova } from './nova.js';

describe('classificarNova', () => {
  describe('pela lista de ingredientes', () => {
    it('NOVA 4 quando há marcadores, listando quais', () => {
      const r = classificarNova(
        alimento({
          ingredientes: 'Farinha de trigo, açúcar, emulsificante lecitina de soja e aromatizantes.',
        }),
      );
      expect(r).toEqual({
        grupo: 4,
        origem: 'ingredientes',
        marcadores: ['aromatizante', 'emulsificante'],
      });
    });

    it('NOVA 3 com sal adicionado e sem marcadores (queijo frescal)', () => {
      const r = classificarNova(
        alimento({ ingredientes: 'Leite pasteurizado, cloreto de sódio (sal) e coagulante.' }),
      );
      expect(r?.grupo).toBe(3);
    });

    it('NOVA 2 para ingrediente culinário vendido sozinho', () => {
      expect(
        classificarNova(alimento({ ingredientes: 'Mel', categorias: ['en:honeys'] }))?.grupo,
      ).toBe(2);
    });

    it('NOVA 1 sem adições', () => {
      expect(classificarNova(alimento({ ingredientes: 'Aveia em flocos' }))?.grupo).toBe(1);
    });

    it('ignora "sem glúten" e avisos de alérgicos (não são ingredientes)', () => {
      const r = classificarNova(
        alimento({ ingredientes: 'Feijão carioca. Não contém glúten. ALÉRGICOS: contém lactose.' }),
      );
      expect(r?.grupo).toBe(1);
    });

    it('glúten como ingrediente da lista é marcador (pão industrializado)', () => {
      const r = classificarNova(
        alimento({ ingredientes: 'Farinha de trigo integral, glúten, óleo de soja, sal' }),
      );
      expect(r?.marcadores).toEqual(['glúten adicionado']);
    });

    it('a lista de ingredientes tem prioridade sobre a NOVA informada pela fonte', () => {
      // O OFF classifica este biscoito como NOVA 3, mas ele tem emulsificante e aromatizantes.
      const r = classificarNova(
        alimento({
          ingredientes: 'Farinha, açúcar, emulsificante e aromatizantes',
          novaInformada: 3,
        }),
      );
      expect(r?.grupo).toBe(4);
    });
  });

  describe('sem lista de ingredientes', () => {
    it('usa a NOVA informada pela fonte', () => {
      expect(classificarNova(alimento({ novaInformada: 2 }))).toEqual({
        grupo: 2,
        origem: 'fonte',
        marcadores: [],
      });
    });

    it('estima pela categoria', () => {
      expect(classificarNova(alimento({ categorias: ['en:sodas'] }))).toMatchObject({
        grupo: 4,
        origem: 'categoria',
      });
    });

    it('estima pelo nome quando não há nem categoria', () => {
      expect(classificarNova(alimento({ nome: 'Salsicha Hot Dog' }))).toMatchObject({
        grupo: 4,
        origem: 'nome',
      });
    });

    it('retorna null quando nada permite classificar', () => {
      expect(classificarNova(alimento({ nome: 'Produto X' }))).toBeNull();
    });
  });
});
