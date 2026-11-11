import type { DadosAlimento } from './dados-alimento.js';
import { limparIngredientes, normalizar } from './texto.js';

/**
 * Alimento pronto para as regras: os dados de entrada mais o que todas elas usam, calculado
 * uma única vez (a lista de ingredientes limpa e se o produto é bebida).
 */
export type Alimento = DadosAlimento & {
  /** Lista de ingredientes normalizada (ver limparIngredientes). Vazia se não houver. */
  textoIngredientes: string;
  /** false quando não há lista ou ela só tinha frases como "sem glúten". */
  temIngredientes: boolean;
  /** Avaliado por 100 ml (bebida) ou por 100 g (sólido). */
  bebida: boolean;
};

export function prepararAlimento(dados: DadosAlimento): Alimento {
  const textoIngredientes = limparIngredientes(dados.ingredientes);
  return {
    ...dados,
    textoIngredientes,
    // Basta uma palavra: "Mel" e "Sal" são listas de ingredientes válidas.
    temIngredientes: /[a-z]{2,}/.test(textoIngredientes),
    bebida: ehBebida(dados),
  };
}

/** Vendidos em litros, mas sólidos: a tabela nutricional deles vem por 100 g. */
const CATEGORIAS_NAO_BEBIDA = /^en:(ice-creams|frozen-desserts|sorbets|ice-cream-tubs)$/;
const NOMES_NAO_BEBIDA = /sorvete|picole|gelato|acai (cremoso|na tigela)/;

const POS_PARA_PREPARO = [
  'en:beverage-preparations',
  'en:instant-beverages',
  'en:cocoa-and-chocolate-powders',
];

/**
 * Bebida (avaliada por 100 ml) ou alimento sólido (por 100 g)?
 * 1. sorvetes e similares são sólidos, mesmo vendidos em litros;
 * 2. depois, a unidade da embalagem (ml/L ou g/kg);
 * 3. por fim, a categoria "en:beverages", exceto pós para preparo.
 * Atenção: a tag "en:plant-based-foods-and-beverages" NÃO indica bebida.
 */
function ehBebida(dados: DadosAlimento): boolean {
  if (dados.categorias.some((c) => CATEGORIAS_NAO_BEBIDA.test(c))) return false;
  if (NOMES_NAO_BEBIDA.test(normalizar(dados.nome))) return false;

  const q = normalizar(dados.quantidade);
  if (/\d\s*(ml|l|litros?)\b/.test(q)) return true;
  if (/\d\s*(g|kg)\b/.test(q)) return false;

  return (
    dados.categorias.includes('en:beverages') &&
    !dados.categorias.some((c) => POS_PARA_PREPARO.includes(c))
  );
}
