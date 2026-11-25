import type { Macronutrients, NutritionFacts } from '@nutriscan/shared';

import { ehBebida } from '../analise/alimento.js';
import type { DadosAlimento } from '../analise/dados-alimento.js';
import {
  arredondar,
  MICRONUTRIENTES,
  paraLista,
  type QuantidadesMicro,
} from './micronutrientes.js';
import { ALIMENTOS_TACO, type AlimentoTaco } from './taco.js';

/**
 * "Fonte" na regra da ANVISA para alegações: 15% do VDR na porção. Aqui vale a porção ou 100 g, o
 * que for maior: um copo de leite (200 ml) é fonte de cálcio, 100 ml não; a aveia é medida em
 * 100 g, mesmo com porção de 30 g.
 */
const MINIMO_PCT_VDR_TIPICO = 15;
const MAXIMO_TIPICOS = 6;

/**
 * Macros e micronutrientes de um alimento, para informar (a nota não usa). Sem nenhum dos
 * macronutrientes principais não há o que mostrar: undefined.
 */
export function montarNutricao(dados: DadosAlimento): NutritionFacts | undefined {
  const n = dados.nutrientes;
  const por100: Macronutrients = limpar({
    energiaKcal: n.energiaKcal,
    carboidratos: n.carboidratos,
    acucares: n.acucares,
    fibras: n.fibras,
    proteinas: n.proteinas,
    gorduras: n.gorduras,
    gordurasSaturadas: n.gorduraSaturada,
    sodioMg: n.sodioMg,
  });
  const temMacros = [por100.carboidratos, por100.proteinas, por100.gorduras].some(
    (v) => v !== undefined,
  );
  if (!temMacros) return undefined;

  const declarados = dados.micronutrientes ?? {};
  const tipicos = tipicosDaCategoria(dados.categorias, dados.porcao, declarados);
  return {
    // A tabela lida na foto diz a base (100 g ou 100 ml); sem ela, o palpite pela embalagem.
    unidade: dados.unidadeDaTabela ?? (ehBebida(dados) ? 'ml' : 'g'),
    por100,
    ...(dados.porcao !== undefined && { porcao: dados.porcao }),
    micronutrientes: paraLista(declarados),
    ...(tipicos && { tipicos }),
  };
}

/**
 * Categorias que tiram o produto da estimativa, qualquer que seja a regra (ex.: castanha coberta
 * de chocolate também é "en:cashew-nuts"): a composição dele já não é a do alimento simples.
 * Cada termo vale no começo de uma palavra da tag: "en:unsweetened-yogurts" não é "sweetened".
 */
const NAO_E_ALIMENTO_SIMPLES =
  /(?<![a-z])(?:chocolate|confectioner|candies|candied|sweetened|cereal-bars|biscuits|cakes|desserts|ready-meals)/;
/**
 * O OFF põe o iogurte natural também em "en:desserts" (sobremesas lácteas fermentadas): com
 * "en:plain-yogurts" ele continua sendo alimento simples.
 */
const SEMPRE_SIMPLES = ['en:plain-yogurts'];

/** O alimento da TACO que corresponde às categorias do produto, se houver um. */
export function alimentoTacoDe(categorias: readonly string[]): AlimentoTaco | undefined {
  const simples = categorias.some((c) => SEMPRE_SIMPLES.includes(c));
  if (!simples && categorias.some((c) => NAO_E_ALIMENTO_SIMPLES.test(c))) return undefined;
  const tem = new Set(categorias);
  return ALIMENTOS_TACO.find(
    (a) => a.categorias.some((c) => tem.has(c)) && !a.exceto?.some((c) => tem.has(c)),
  );
}

/** Os declarados no rótulo ficam de fora: o valor medido no produto vale mais que a estimativa. */
function tipicosDaCategoria(
  categorias: readonly string[],
  porcao: number | undefined,
  declarados: QuantidadesMicro,
): NutritionFacts['tipicos'] {
  const alimento = alimentoTacoDe(categorias);
  if (!alimento) return undefined;
  const fator = Math.max(1, (porcao ?? 0) / 100);
  const fontes: QuantidadesMicro = Object.fromEntries(
    Object.entries(alimento.valores).filter(
      ([id, valor]) =>
        !(id in declarados) &&
        ((valor * fator) / MICRONUTRIENTES[id as keyof QuantidadesMicro].vdr) * 100 >=
          MINIMO_PCT_VDR_TIPICO,
    ),
  );
  const itens = paraLista(fontes).slice(0, MAXIMO_TIPICOS);
  return itens.length > 0 ? { alimento: alimento.nome, itens } : undefined;
}

/** Tira os campos vazios e arredonda (o OFF guarda valores como 28.3333333). */
function limpar(o: Macronutrients): Macronutrients {
  return Object.fromEntries(
    Object.entries(o)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, arredondar(v as number)]),
  );
}
