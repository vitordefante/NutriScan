import type { NovaGroup, NutriScoreLetter } from '@nutriscan/shared';

/**
 * Entrada do motor de nota: os dados de um alimento já normalizados.
 *
 * O motor não conhece o formato do Open Food Facts. Quem converte é o módulo de produtos
 * (open-food-facts.mapper.ts). Assim o motor continua puro e fácil de testar, e uma futura
 * leitura de rótulo por foto (OCR) pode produzir o mesmo formato.
 */
export type DadosAlimento = {
  nome: string;
  /** Texto livre da embalagem, ex.: "395 g", "1 L". Usado para saber se é bebida. */
  quantidade?: string;
  /** Tags de categoria do OFF (ex.: "en:sodas"). */
  categorias: string[];
  /** Tags de selos do OFF (ex.: "en:organic"). */
  selos: string[];
  /** Lista de ingredientes em português, como impressa no rótulo. */
  ingredientes?: string;
  /** Códigos de aditivos em minúsculas, sem prefixo (ex.: "e250", "e150d"). */
  aditivos: string[];
  /** Classificação NOVA informada pela fonte, se houver. */
  novaInformada?: GrupoNova;
  /** Letra do Nutri-Score informada pela fonte, se houver. */
  nutriScoreInformado?: LetraNutriScore;
  /** Valores por 100 g (ou 100 ml, em bebidas). */
  nutrientes: Nutrientes;
};

/** Os mesmos tipos do contrato com o app (@nutriscan/shared), com nomes em português aqui. */
export type GrupoNova = NovaGroup;
export type LetraNutriScore = NutriScoreLetter;

export type Nutrientes = {
  energiaKcal?: number;
  /** Açúcares totais, em gramas. */
  acucares?: number;
  /** Açúcares adicionados, em gramas (raramente preenchido no OFF). */
  acucaresAdicionados?: number;
  /** Gorduras saturadas, em gramas. */
  gorduraSaturada?: number;
  /** Sódio, em miligramas. */
  sodioMg?: number;
  /** Fibras, em gramas. */
  fibras?: number;
  /** Proteínas, em gramas. */
  proteinas?: number;
  /** Percentual estimado de frutas, legumes e leguminosas (0–100). */
  frutasLegumesPct?: number;
};
