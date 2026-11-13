import type { LabelLine } from '@nutriscan/shared';
import { describe, expect, it } from 'vitest';

import visionRdc429 from './__fixtures__/vision-rdc429.json' with { type: 'json' };
import { extrairListaIngredientes, juntarLinhas } from './lista-ingredientes.js';
import { agruparEmFileiras, lerTabelaNutricional, textoDaFileira } from './tabela-nutricional.js';

/** Linhas de parágrafo, uma embaixo da outra (como o Vision devolve um bloco de texto). */
const paragrafo = (...textos: string[]): LabelLine[] =>
  textos.map((texto, i) => ({ texto, x: 0.05, y: 0.1 + i * 0.05, largura: 0.9, altura: 0.04 }));

/**
 * Tabela: cada fileira é uma lista de células; as células viram linhas separadas do OCR, na
 * mesma altura (com um pequeno desalinhamento, como numa foto real).
 */
const tabela = (...fileiras: string[][]): LabelLine[] =>
  fileiras.flatMap((celulas, i) =>
    celulas.map((texto, j) => ({
      texto,
      x: j === 0 ? 0.05 : 0.45 + j * 0.15,
      y: 0.1 + i * 0.06 + (j % 2) * 0.008,
      largura: j === 0 ? 0.38 : 0.1,
      altura: 0.04,
    })),
  );

describe('extrairListaIngredientes', () => {
  it('pega o texto entre "Ingredientes:" e o aviso de alergênicos', () => {
    const linhas = paragrafo(
      'BISCOITO RECHEADO SABOR CHOCOLATE',
      'INGREDIENTES: Farinha de trigo enriquecida com ferro e ácido fólico,',
      'açúcar, gordura vegetal, cacau em pó, estabi-',
      'lizante lecitina de soja e aromatizante.',
      'ALÉRGICOS: CONTÉM TRIGO E SOJA. CONTÉM GLÚTEN.',
    );
    expect(extrairListaIngredientes(linhas)).toBe(
      'Farinha de trigo enriquecida com ferro e ácido fólico, açúcar, gordura vegetal, cacau em pó, estabilizante lecitina de soja e aromatizante.',
    );
  });

  it('cosmético: "Ingredients:" até o modo de uso', () => {
    const linhas = paragrafo(
      'Ingredients: Aqua, Glycerin, Cetearyl Alcohol,',
      'Parfum, Methylparaben.',
      'Modo de uso: aplique sobre a pele limpa.',
    );
    expect(extrairListaIngredientes(linhas)).toBe(
      'Aqua, Glycerin, Cetearyl Alcohol, Parfum, Methylparaben.',
    );
  });

  it('"conservador" (aditivo) não é confundido com "conservar"', () => {
    const linhas = paragrafo(
      'Ingredientes: polpa de tomate, açúcar, sal, conservador sorbato de potássio.',
      'Conservar em local seco.',
    );
    expect(extrairListaIngredientes(linhas)).toBe(
      'polpa de tomate, açúcar, sal, conservador sorbato de potássio.',
    );
  });

  it('sem o cabeçalho, usa o texto todo (a pessoa fotografou só a lista)', () => {
    expect(extrairListaIngredientes(paragrafo('Leite integral, fermento lácteo.'))).toBe(
      'Leite integral, fermento lácteo.',
    );
  });

  it('foto sem texto útil: undefined', () => {
    expect(extrairListaIngredientes([])).toBeUndefined();
    expect(extrairListaIngredientes(paragrafo('Ingredientes:', '12 3'))).toBeUndefined();
  });

  it('emenda só hífen de quebra de palavra', () => {
    expect(juntarLinhas(['ácido cítri-', 'co, PEG-', '40'])).toBe('ácido cítrico, PEG- 40');
  });
});

describe('agruparEmFileiras', () => {
  it('junta as células da mesma altura, da esquerda para a direita', () => {
    const linhas = tabela(['Sódio (mg)', '400', '120', '6']);
    expect(agruparEmFileiras([...linhas].reverse()).map(textoDaFileira)).toEqual([
      'Sódio (mg) 400 120 6',
    ]);
  });
});

describe('lerTabelaNutricional', () => {
  it('modelo novo (RDC 429): usa a coluna de 100 g', () => {
    const lida = lerTabelaNutricional(
      tabela(
        ['INFORMAÇÃO NUTRICIONAL'],
        ['Porções por embalagem: 4 porções'],
        ['Porção: 30 g (3 biscoitos)'],
        ['', '100 g', '30 g', '%VD*'],
        ['Valor energético (kcal)', '480', '144', '7'],
        ['Carboidratos (g)', '68', '20', '7'],
        ['Açúcares totais (g)', '32', '9,6'],
        ['Açúcares adicionados (g)', '30', '9,0', '18'],
        ['Proteínas (g)', '5,8', '1,7', '3'],
        ['Gorduras totais (g)', '20', '6,0', '9'],
        ['Gorduras saturadas (g)', '9,5', '2,9', '14'],
        ['Gorduras trans (g)', '0', '0', '0'],
        ['Fibras alimentares (g)', '2,1', '0,6', '3'],
        ['Sódio (mg)', '310', '93', '5'],
      ),
    );
    expect(lida).toEqual({
      unidade: 'g',
      origem: 'coluna_100',
      nutrientes: {
        energiaKcal: 480,
        acucares: 32,
        acucaresAdicionados: 30,
        proteinas: 5.8,
        gorduraSaturada: 9.5,
        fibras: 2.1,
        sodioMg: 310,
      },
    });
  });

  it('bebida: tabela por 100 ml', () => {
    const lida = lerTabelaNutricional(
      tabela(
        ['', '100 ml', '200 ml', '%VD*'],
        ['Valor energético (kcal)', '42', '84', '4'],
        ['Açúcares totais (g)', '10', '20'],
        ['Açúcares adicionados (g)', '10', '20', '40'],
        ['Sódio (mg)', '5', '10', '0'],
      ),
    );
    expect(lida?.unidade).toBe('ml');
    expect(lida?.nutrientes.acucaresAdicionados).toBe(10);
  });

  it('modelo antigo (só porção): converte para 100 g pela porção', () => {
    const lida = lerTabelaNutricional(
      paragrafo(
        'INFORMAÇÃO NUTRICIONAL',
        'Porção de 25 g (1 pacote)',
        'Quantidade por porção %VD(*)',
        'Valor energético 125 kcal = 525 kJ 6%',
        'Carboidratos 16 g 5%',
        'Proteínas 1,5 g 2%',
        'Gorduras totais 6,0 g 11%',
        'Gorduras saturadas 2,5 g 11%',
        'Sódio 220 mg 9%',
      ),
    );
    expect(lida).toEqual({
      unidade: 'g',
      origem: 'convertido_da_porcao',
      nutrientes: { energiaKcal: 500, proteinas: 6, gorduraSaturada: 10, sodioMg: 880 },
    });
  });

  it('"**" (não significativo) vale zero; "<1" é lido; ponto de milhar no sódio', () => {
    const lida = lerTabelaNutricional(
      tabela(
        ['', '100 g', '5 g'],
        ['Valor energético (kcal)', '0', '0'],
        ['Açúcares adicionados (g)', '**', '**'],
        ['Proteínas (g)', '<1', '0'],
        ['Sódio (mg)', '1.200', '60'],
      ),
    );
    expect(lida?.nutrientes).toEqual({
      energiaKcal: 0,
      acucaresAdicionados: 0,
      proteinas: 1,
      sodioMg: 1200,
    });
  });

  it('célula de 100 g não lida: o valor fica faltando, não pega o da porção ao lado', () => {
    const linhas = tabela(
      ['', '100 g', '30 g', '%VD*'],
      ['Valor energético (kcal)', '480', '144', '7'],
      ['Açúcares adicionados (g)', '30', '9,0', '18'],
      ['Gorduras saturadas (g)', '9,5', '2,9', '14'],
      ['Sódio (mg)', '310', '93', '5'],
    ).filter((l) => l.texto !== '9,5'); // o OCR "pulou" a célula
    expect(lerTabelaNutricional(linhas)?.nutrientes).toEqual({
      energiaKcal: 480,
      acucaresAdicionados: 30,
      sodioMg: 310,
    });
  });

  it('sem saber a base (nem 100 g nem porção), não chuta valores', () => {
    const lida = lerTabelaNutricional(
      tabela(
        ['Valor energético (kcal)', '480'],
        ['Açúcares adicionados (g)', '30'],
        ['Sódio (mg)', '310'],
      ),
    );
    expect(lida).toBeNull();
  });

  it('foto que não é tabela: null', () => {
    expect(lerTabelaNutricional(paragrafo('Ingredientes: açúcar, cacau.', '100 g'))).toBeNull();
  });
});

describe('saída real do Apple Vision', () => {
  // O Vision lê a tabela por coluna (todos os nomes, depois os valores de 100 g, depois os da
  // porção) e não lê os "0" sozinhos da linha de gorduras trans.
  const { linhas } = visionRdc429 as { linhas: LabelLine[] };

  it('lista de ingredientes, com a hifenização emendada', () => {
    expect(extrairListaIngredientes(linhas)).toBe(
      'Farinha de trigo enriquecida com ferro e ácido fólico, açúcar, gordura vegetal, cacau em pó, sal, estabilizante lecitina de soja, aromatizante e corante caramelo IV.',
    );
  });

  it('tabela: cada nome com o valor da coluna de 100 g', () => {
    expect(lerTabelaNutricional(linhas)?.nutrientes).toEqual({
      energiaKcal: 480,
      acucares: 32,
      acucaresAdicionados: 30,
      proteinas: 5.8,
      gorduraSaturada: 9.5,
      fibras: 2.1,
      sodioMg: 310,
    });
  });
});
