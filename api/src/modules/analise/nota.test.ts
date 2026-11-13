import type { Analysis } from '@nutriscan/shared';
import { describe, expect, it } from 'vitest';

import { alimento, codigosDaAmostra, produtoReal } from './__fixtures__/alimentos.js';
import { analisarAlimento, faixaDaNota } from './nota.js';

const completoOuParcial = (a: Analysis) => {
  if (a.status === 'dados_insuficientes') throw new Error('esperava uma nota');
  return a;
};

describe('analisarAlimento', () => {
  it('a nota é 100 + a soma dos itens, limitada a 0–100 (em todos os produtos reais)', () => {
    for (const codigo of codigosDaAmostra) {
      const a = completoOuParcial(analisarAlimento(produtoReal(codigo)));
      const soma = a.itens.reduce((t, i) => t + i.pontos, 0);
      expect(a.nota, codigo).toBe(Math.max(0, Math.min(100, 100 + soma)));
    }
  });

  it('todo item tem motivo e fonte', () => {
    for (const codigo of codigosDaAmostra) {
      for (const item of completoOuParcial(analisarAlimento(produtoReal(codigo))).itens) {
        expect(item.motivo, `${codigo} ${item.id}`).not.toBe('');
        expect(item.fonte, `${codigo} ${item.id}`).not.toBe('');
      }
    }
  });

  it('explica a nota com um item por componente', () => {
    const a = completoOuParcial(analisarAlimento(produtoReal('7894900010398'))); // refrigerante de cola
    expect(a.itens.map((i) => [i.id, i.pontos])).toEqual([
      ['nova', -45],
      ['nutri-score', -32],
      ['lupa-acucar_adicionado', -10],
      ['aditivo-caramelo-amonico', -4],
      ['aditivo-fosfatos', -4],
    ]);
    expect(a.faixa).toBe('pessimo');
  });

  it('limita o desconto por aditivos a −20 com um item explícito', () => {
    const a = completoOuParcial(
      analisarAlimento(
        alimento({
          ingredientes: 'Água, sal',
          aditivos: ['e250', 'e171', 'e320', 'e321'],
          novaInformada: 4,
        }),
      ),
    );
    // Grupos: −8 −8 −8 −4 = −28 → limite devolve +8.
    expect(a.itens.find((i) => i.id === 'aditivos-limite')?.pontos).toBe(8);
    expect(
      a.itens.filter((i) => i.id.startsWith('aditivo')).reduce((t, i) => t + i.pontos, 0),
    ).toBe(-20);
  });

  it('gera um alerta por grupo de aditivo', () => {
    const a = analisarAlimento(produtoReal('7894321223223')); // barra de cereal: BHA, BHT, polióis
    expect(a.alertas.map((al) => [al.id, al.severidade])).toEqual([
      ['aditivo-bha', 'alto'],
      ['aditivo-bht', 'moderado'],
      ['aditivo-poliois', 'baixo'],
    ]);
  });

  it('dá bônus de +5 para orgânicos, mas não para "non-organic"', () => {
    const base = {
      ingredientes: 'Aveia',
      nutrientes: { energiaKcal: 370, acucares: 1, gorduraSaturada: 1, sodioMg: 0 },
    };
    const organico = completoOuParcial(
      analisarAlimento(alimento({ ...base, selos: ['en:organic'] })),
    );
    const naoOrganico = completoOuParcial(
      analisarAlimento(alimento({ ...base, selos: ['en:non-organic'] })),
    );
    expect(organico.itens.some((i) => i.id === 'organico')).toBe(true);
    expect(naoOrganico.itens.some((i) => i.id === 'organico')).toBe(false);
  });

  it('nota parcial quando falta a tabela nutricional', () => {
    const a = analisarAlimento(alimento({ categorias: ['en:breakfast-cereals'] }));
    expect(a).toMatchObject({ status: 'parcial', nota: 55, faltando: ['tabela nutricional'] });
  });

  it('nota parcial quando falta sódio para avaliar a lupa', () => {
    const a = analisarAlimento(
      alimento({ ingredientes: 'Farinha, gordura vegetal', nutriScoreInformado: 'C' }),
    );
    expect(a.status).toBe('parcial');
    if (a.status === 'parcial') expect(a.faltando).toContain('sódio na tabela nutricional');
  });

  it('dados insuficientes quando não há como avaliar processamento nem nutrição', () => {
    const a = analisarAlimento(alimento({ nome: 'Produto X' }));
    expect(a).toEqual({
      status: 'dados_insuficientes',
      faltando: ['lista de ingredientes', 'tabela nutricional'],
      alertas: [],
    });
  });

  it('marca a NOVA estimada pelo nome', () => {
    const a = completoOuParcial(analisarAlimento(produtoReal('7899004741643'))); // salsicha
    expect(a.itens.find((i) => i.id === 'nova')).toMatchObject({ pontos: -45, estimado: true });
  });
});

describe('destaques', () => {
  it('traz NOVA, Nutri-Score e lupa estruturados (biscoito recheado real)', () => {
    const a = completoOuParcial(analisarAlimento(produtoReal('7891000241356')));
    expect(a.destaques).toEqual({
      nova: {
        grupo: 4,
        nome: 'Ultraprocessado',
        motivo:
          'Contém marcadores de ultraprocessamento: aromatizante, emulsificante, gordura vegetal.',
      },
      nutriScore: { letra: 'C' },
      lupa: [
        {
          nutriente: 'acucar_adicionado',
          titulo: 'Alto em açúcar adicionado',
          detalhe: '33 g por 100 g (limite: 15 g)',
          estimado: false,
        },
      ],
    });
  });

  it('batem com os itens da nota em todos os produtos reais', () => {
    for (const codigo of codigosDaAmostra) {
      const a = completoOuParcial(analisarAlimento(produtoReal(codigo)));
      const ids = a.itens.map((i) => i.id);
      expect(a.destaques.nova !== null, codigo).toBe(ids.includes('nova'));
      expect(a.destaques.nutriScore !== null, codigo).toBe(ids.includes('nutri-score'));
      expect(
        a.destaques.lupa.map((l) => `lupa-${l.nutriente}`),
        codigo,
      ).toEqual(ids.filter((id) => id.startsWith('lupa-')));
    }
  });
});

describe('faixaDaNota', () => {
  it.each([
    [100, 'excelente'],
    [80, 'excelente'],
    [79, 'bom'],
    [60, 'bom'],
    [59, 'regular'],
    [40, 'regular'],
    [39, 'ruim'],
    [20, 'ruim'],
    [19, 'pessimo'],
    [0, 'pessimo'],
  ] as const)('%i → %s', (nota, faixa) => {
    expect(faixaDaNota(nota)).toBe(faixa);
  });
});
