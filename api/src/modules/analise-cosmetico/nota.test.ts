import type { Analysis } from '@nutriscan/shared';
import { describe, expect, it } from 'vitest';

import { lerIngredientes } from './ingredientes.js';
import { analisarCosmetico } from './nota.js';

const analisar = (ingredientes: string, selos: string[] = []) =>
  analisarCosmetico({ nome: 'Produto de teste', ingredientes, selos });

const comNota = (a: Analysis) => {
  if (a.status === 'dados_insuficientes') throw new Error('esperava uma nota');
  return a;
};

const grupos = (ingredientes: string) =>
  comNota(analisar(ingredientes)).alertas.map((a) => a.id.replace('cosmetico-', ''));

describe('lerIngredientes', () => {
  it('separa por vírgula, "•" e quebra de linha, sem quebrar "1,3-diol"', () => {
    const itens = lerIngredientes(
      'Ingredientes: Aqua, 2-Bromo-2-Nitropropane-1,3-Diol • Parfum\nGlycerin',
    );
    expect(itens.map((i) => i.original)).toEqual([
      'Aqua',
      '2-Bromo-2-Nitropropane-1,3-Diol',
      'Parfum',
      'Glycerin',
    ]);
  });

  it('gera as formas com e sem parênteses e separadas por "/"', () => {
    const [item] = lerIngredientes('PARFUM (FRAGRANCE)');
    expect(item!.formas).toEqual(['parfum (fragrance)', 'parfum', 'fragrance']);
    expect(lerIngredientes('AQUA/WATER/EAU')[0]!.formas).toContain('water');
  });

  it('limpa entidades HTML, pontuação final e texto de rótulo grudado', () => {
    const itens = lerIngredientes(
      'Aqua, LIMONENE &quot;, Linalool., Parfum (Perfume). www.marca.com.br Produzido por: X',
    );
    expect(itens.map((i) => i.original)).toEqual([
      'Aqua',
      'LIMONENE',
      'Linalool',
      'Parfum (Perfume)',
      'www.marca.com.br Produzido por: X',
    ]);
  });

  it('lista sem espaços: "Ceteareth-20,1,2-Hexanediol" são dois ingredientes', () => {
    const itens = lerIngredientes('Aqua,Ceteareth-20,1,2-Hexanediol,Glycerin');
    expect(itens.map((i) => i.original)).toEqual([
      'Aqua',
      'Ceteareth-20',
      '1,2-Hexanediol',
      'Glycerin',
    ]);
  });

  it('tira o cabeçalho de qualquer item ("INCI:", "Composição:", "Shampoo. Ingredients:")', () => {
    expect(lerIngredientes('INCI: Aqua, Glycerin')[0]!.original).toBe('Aqua');
    expect(lerIngredientes('Composição: Água')[0]!.original).toBe('Água');
    expect(lerIngredientes('Shampoo. Ingredients: Methylparaben').map((i) => i.original)).toEqual([
      'Shampoo',
      'Methylparaben',
    ]);
  });

  it('lista vazia ou só com símbolos não tem ingredientes', () => {
    expect(lerIngredientes('')).toEqual([]);
    expect(lerIngredientes(' . , ')).toEqual([]);
  });
});

describe('analisarCosmetico', () => {
  it('sem lista de ingredientes: dados insuficientes (sem inventar nota)', () => {
    expect(analisarCosmetico({ nome: 'X', selos: [] })).toEqual({
      status: 'dados_insuficientes',
      faltando: ['lista de ingredientes'],
      alertas: [],
    });
  });

  it('lista sem nada de atenção: 100', () => {
    const a = comNota(analisar('Aqua, Glycerin, Cocos Nucifera Oil, Tocopherol, Citric Acid'));
    expect(a.nota).toBe(100);
    expect(a.itens).toEqual([]);
    expect(a.alertas).toEqual([]);
  });

  it('desconta uma vez por grupo e mostra os ingredientes que o ativaram', () => {
    const a = comNota(analisar('Aqua, Methylparaben, Ethylparaben, Glycerin'));
    expect(a.itens).toHaveLength(1);
    expect(a.itens[0]!.pontos).toBe(-3);
    expect(a.alertas[0]!.ingredientes).toEqual(['Methylparaben', 'Ethylparaben']);
    expect(a.nota).toBe(97);
  });

  it('distingue os parabenos proibidos, restritos e de cadeia curta', () => {
    expect(grupos('Isobutylparaben')).toEqual(['parabenos-proibidos']);
    expect(grupos('Butylparaben')).toEqual(['parabenos-restritos']);
    expect(grupos('Propylparaben, Methylparaben')).toEqual([
      'parabenos-restritos',
      'parabenos-curtos',
    ]);
  });

  it('reconhece nomes em português', () => {
    expect(grupos('Água, Óleo Mineral, Metilparabeno, Fragrância')).toEqual([
      'fragrancia',
      'derivados-petroleo',
      'parabenos-curtos',
    ]);
  });

  it('fragrância só como ingrediente inteiro; "Aroma" (sabor) não conta', () => {
    expect(grupos('Parfum/Fragrance')).toEqual(['fragrancia']);
    expect(grupos('Aroma, Sorbitol')).toEqual([]);
    expect(grupos('Fragrance Free Base')).toEqual([]);
  });

  it('PEG não é microplástico; polietileno é', () => {
    expect(grupos('Polyethylene Glycol')).toEqual([]);
    expect(grupos('PEG-12')).toEqual(['etoxilados']);
    expect(grupos('Polyethylene')).toEqual(['microplasticos']);
  });

  it('siloxano cíclico é moderado; silicone linear é baixo', () => {
    expect(grupos('Cyclopentasiloxane, Dimethicone')).toEqual([
      'siloxanos-ciclicos',
      'silicones-lineares',
    ]);
  });

  it('formaldeído só como ingrediente em si; liberadores são outro grupo', () => {
    expect(grupos('Formaldehyde')).toEqual(['formaldeido']);
    expect(grupos('DMDM Hydantoin')).toEqual(['liberadores-formaldeido']);
  });

  it('marca exposição potencial como estimado (talco, PEG)', () => {
    const a = comNota(analisar('Talc, Laureth-4'));
    expect(a.alertas.every((al) => al.estimado)).toBe(true);
    expect(a.itens.every((i) => i.estimado)).toBe(true);
  });

  it('aplica o teto do nível baixo com um item explícito', () => {
    const a = comNota(
      analisar(
        'Aqua, Sodium Lauryl Sulfate, PEG-7, Mineral Oil, Methylparaben, Dimethicone, Limonene',
      ),
    );
    // 6 grupos baixos × −3 = −18 → teto −15 (item de limite +3)
    expect(a.itens.find((i) => i.id === 'cosmetico-limite-baixo')?.pontos).toBe(3);
    expect(a.nota).toBe(85);
  });

  it('a nota é sempre 100 + soma dos itens, limitada a 0–100', () => {
    const a = comNota(
      analisar(
        'Isobutylparaben, Butylphenyl Methylpropional, Formaldehyde, Hydroquinone, Triclosan, Talc',
      ),
    );
    expect(a.nota).toBe(0);
    expect(a.faixa).toBe('pessimo');
  });

  it('certificação orgânica soma +5 (limitado a 100)', () => {
    const a = comNota(analisar('Aqua, Methylparaben', ['en:ecocert']));
    expect(a.itens.map((i) => i.pontos)).toEqual([-3, 5]);
    expect(a.nota).toBe(100);
  });

  it('lista curta e sem água (só os destaques da embalagem) vira nota parcial', () => {
    const a = analisar('Óleo de Coco, Água de Coco, Óleo de Abacate, Manteiga de Murumuru');
    expect(a.status).toBe('parcial');
    expect(comNota(a).nota).toBe(100); // é um teto: "≤ 100"
  });

  it('"Água Deionizada" conta como água; "Água de Coco" não', () => {
    expect(analisar('Água Deionizada, Glicerina, Lauril Sulfato de Sódio, Fragrância').status).toBe(
      'completa',
    );
    expect(analisar('Aqua Purificata, Glycerin').status).toBe('completa');
  });

  it('Benzyl Salicylate conta só como disruptor em avaliação, não também como alérgeno', () => {
    expect(grupos('Aqua, Glycerin, Benzyl Salicylate')).toEqual(['disruptores-em-avaliacao']);
  });

  it('lista curta COM água é considerada completa (produto simples)', () => {
    const a = analisar('Gel de Aloe vera (Babosa), Goma xantana, Glicerina vegetal, Água');
    expect(a.status).toBe('completa');
  });

  it('disruptor endócrino em avaliação desconta −6 (meio-termo decidido pelo autor)', () => {
    const a = comNota(analisar('Aqua, Glycerin, Benzyl Salicylate, Sorbitol, BHT, Xanthan Gum'));
    const item = a.itens.find((i) => i.id === 'cosmetico-disruptores-em-avaliacao');
    expect(item?.pontos).toBe(-6);
    expect(a.alertas.find((al) => al.id === item?.id)?.ingredientes).toEqual([
      'Benzyl Salicylate',
      'BHT',
    ]);
  });

  it('flúor do creme dental desconta −3 (preferência do autor)', () => {
    expect(grupos('Calcium Carbonate, Aqua, Sodium Monofluorophosphate 0.145%')).toEqual(['fluor']);
    expect(grupos('Fluoreto de Sódio')).toEqual(['fluor']);
  });

  it('não preenche os destaques de alimentos', () => {
    expect(comNota(analisar('Aqua')).destaques).toEqual({ nova: null, nutriScore: null, lupa: [] });
  });
});
