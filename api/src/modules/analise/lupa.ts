import type { Alimento } from './alimento.js';
import type { ClassificacaoNova } from './nova.js';
import { INGREDIENTES_ACUCAR, itensPrincipais } from './texto.js';

export type NutrienteLupa = 'acucar_adicionado' | 'gordura_saturada' | 'sodio';

export type AltoEm = {
  nutriente: NutrienteLupa;
  /** Valor encontrado e limite, na unidade de `unidade`, por 100 g ou 100 ml. */
  valor: number;
  limite: number;
  unidade: 'g' | 'mg';
  porcao: '100 g' | '100 ml';
  /** true quando o açúcar adicionado foi estimado pelos açúcares totais. */
  estimado: boolean;
};

export type ResultadoLupa = {
  /** Alimento dispensado da lupa (IN 75/2020, Anexo XVI). */
  isento: boolean;
  altos: AltoEm[];
  /** Nutrientes sem dado suficiente para avaliar. */
  faltando: NutrienteLupa[];
};

/** IN 75/2020, Anexo XV. */
const LIMITES = {
  solido: { acucar_adicionado: 15, gordura_saturada: 6, sodio: 600 },
  liquido: { acucar_adicionado: 7.5, gordura_saturada: 3, sodio: 300 },
} as const;

/** IN 75/2020, Anexo XVI, itens 7–10: leites, leite em pó, óleos vegetais e sal. */
const CATEGORIAS_ISENTAS = [
  'en:whole-milks',
  'en:semi-skimmed-milks',
  'en:skimmed-milks',
  'en:uht-milks',
  'en:pasteurised-milks',
  'en:milk-powders',
  'en:vegetable-oils',
  'en:olive-oils',
  'en:salts',
];

/** Anexo XVI, itens 5–6: leites fermentados e queijos, se sem ingredientes que agreguem açúcar etc. */
const QUEIJOS_E_FERMENTADOS = ['en:cheeses', 'en:yogurts', 'en:fermented-milks'];

/** Sem lista de ingredientes, o açúcar destas categorias é tratado como adicionado. */
const CATEGORIAS_ACUCAR_ADICIONADO = [
  'en:sodas',
  'en:sweetened-beverages',
  'en:candies',
  'en:biscuits',
  'en:ice-creams',
  'en:chocolates',
];

export function avaliarLupa(alimento: Alimento, nova: ClassificacaoNova | null): ResultadoLupa {
  if (isento(alimento, nova)) return { isento: true, altos: [], faltando: [] };

  const liquido = alimento.bebida;
  const limites = liquido ? LIMITES.liquido : LIMITES.solido;
  const porcao = liquido ? '100 ml' : '100 g';
  const n = alimento.nutrientes;
  const altos: AltoEm[] = [];
  const faltando: NutrienteLupa[] = [];

  const acucar = acucarAdicionado(alimento);
  if (acucar === 'desconhecido') {
    // Só falta o dado se ele pudesse mudar o resultado: com açúcares totais abaixo do limite,
    // o adicionado (que é parte deles) também está abaixo.
    if (n.acucares === undefined || n.acucares >= limites.acucar_adicionado)
      faltando.push('acucar_adicionado');
  } else if (acucar.valor >= limites.acucar_adicionado) {
    altos.push({
      nutriente: 'acucar_adicionado',
      valor: acucar.valor,
      limite: limites.acucar_adicionado,
      unidade: 'g',
      porcao,
      estimado: acucar.estimado,
    });
  }

  if (n.gorduraSaturada === undefined) faltando.push('gordura_saturada');
  else if (n.gorduraSaturada >= limites.gordura_saturada) {
    altos.push({
      nutriente: 'gordura_saturada',
      valor: n.gorduraSaturada,
      limite: limites.gordura_saturada,
      unidade: 'g',
      porcao,
      estimado: false,
    });
  }

  if (n.sodioMg === undefined) faltando.push('sodio');
  else if (n.sodioMg >= limites.sodio) {
    altos.push({
      nutriente: 'sodio',
      valor: n.sodioMg,
      limite: limites.sodio,
      unidade: 'mg',
      porcao,
      estimado: false,
    });
  }

  return { isento: false, altos, faltando };
}

function isento(alimento: Alimento, nova: ClassificacaoNova | null): boolean {
  // Itens 1–6 do Anexo XVI exigem "sem adição de ingredientes que agreguem açúcar, gordura
  // saturada ou sódio" — aproximado por NOVA 1 (in natura ou minimamente processado).
  if (nova?.grupo === 1) return true;
  if (alimento.categorias.some((c) => CATEGORIAS_ISENTAS.includes(c))) return true;
  const queijoOuFermentado = alimento.categorias.some((c) => QUEIJOS_E_FERMENTADOS.includes(c));
  return (
    queijoOuFermentado &&
    nova !== null &&
    nova.grupo <= 3 &&
    alimento.temIngredientes &&
    !INGREDIENTES_ACUCAR.test(alimento.textoIngredientes)
  );
}

/**
 * O campo de açúcar adicionado quase nunca vem preenchido. Ordem:
 * 1. valor informado, se consistente; 2. açúcares totais, se a lista de ingredientes tem
 * açúcar (estimado); 3. zero, se a lista de ingredientes não tem açúcar; 4. açúcares totais,
 * sem lista de ingredientes, em categorias de açúcar sempre adicionado (estimado); 5. desconhecido.
 */
function acucarAdicionado(
  alimento: Alimento,
): { valor: number; estimado: boolean } | 'desconhecido' {
  const { acucaresAdicionados, acucares } = alimento.nutrientes;
  if (acucaresAdicionados !== undefined && !adicionadoInconsistente(alimento)) {
    return { valor: acucaresAdicionados, estimado: false };
  }

  if (alimento.temIngredientes) {
    if (!INGREDIENTES_ACUCAR.test(alimento.textoIngredientes)) return { valor: 0, estimado: false };
    return acucares === undefined ? 'desconhecido' : { valor: acucares, estimado: true };
  }

  if (
    acucares !== undefined &&
    alimento.categorias.some((c) => CATEGORIAS_ACUCAR_ADICIONADO.includes(c))
  ) {
    return { valor: acucares, estimado: true };
  }
  return 'desconhecido';
}

/**
 * Detecta açúcar adicionado informado com erro (ex.: 4,2 g em vez de 42 g). A lista de
 * ingredientes segue a ordem decrescente de quantidade; se um açúcar está entre os 3 primeiros
 * ingredientes, ele não pode ser menos de 1/4 dos açúcares totais.
 */
function adicionadoInconsistente(alimento: Alimento): boolean {
  const { acucaresAdicionados, acucares } = alimento.nutrientes;
  if (acucaresAdicionados === undefined || acucares === undefined) return false;
  if (acucaresAdicionados >= acucares / 4) return false;
  const primeiros = itensPrincipais(alimento.textoIngredientes).slice(0, 3);
  return primeiros.some((item) => INGREDIENTES_ACUCAR.test(item));
}
