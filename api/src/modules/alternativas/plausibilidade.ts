/**
 * Cadastros com valores fora do padrão da categoria. O erro mais comum no cadastro colaborativo
 * é digitar os valores de uma PORÇÃO (ex.: 12 g) no campo "por 100 g": tudo fica várias vezes
 * menor e a conta é coerente por dentro (uma maionese com 39 kcal e 3,9 g de gordura) — só dá
 * para perceber comparando com os outros produtos da categoria.
 *
 * Regra: energia abaixo de 1/3 da mediana da categoria é suspeita. Quando o cadastro informa o
 * tamanho da porção, confirma: se "energia × 100 ÷ porção" der um valor normal para a categoria,
 * é a porção digitada no lugar de 100 g (NotCo: 39 × 100 ÷ 12 = 325 kcal, uma maionese comum);
 * se continuar baixo, o valor é real (batata congelada: 116 kcal, porção de 85 g → 137 kcal).
 */

/** Fração da mediana abaixo da qual a energia é suspeita. */
export const FRACAO_MINIMA = 1 / 3;

/** Com poucos produtos a mediana não é confiável: abaixo disso, ninguém é descartado. */
export const AMOSTRA_MINIMA = 5;

export type EnergiaDoCadastro = {
  barcode: string;
  /** Energia por 100 g/ml como está no cadastro. */
  energiaKcal?: number;
  /** Tamanho da porção em g/ml, se o cadastro informa. */
  porcaoG?: number;
};

/** Códigos dos cadastros suspeitos (energia por 100 g muito abaixo do padrão da categoria). */
export function cadastrosSuspeitos(cadastros: readonly EnergiaDoCadastro[]): Set<string> {
  const energias = cadastros
    .map((c) => c.energiaKcal)
    .filter((e): e is number => e !== undefined && e > 0);
  if (energias.length < AMOSTRA_MINIMA) return new Set();

  const limite = mediana(energias) * FRACAO_MINIMA;
  const suspeito = ({ energiaKcal, porcaoG }: EnergiaDoCadastro) => {
    if (energiaKcal === undefined || energiaKcal >= limite) return false;
    // Sem a porção, não há como confirmar: vale só a regra da mediana.
    if (!porcaoG || porcaoG <= 0) return true;
    // Com porção de 100 g ou mais, a conta não sobe o valor: o baixo é real.
    return (energiaKcal * 100) / porcaoG >= limite;
  };
  return new Set(cadastros.filter(suspeito).map((c) => c.barcode));
}

function mediana(valores: readonly number[]): number {
  const ordenados = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordenados.length / 2);
  return ordenados.length % 2 ? ordenados[meio]! : (ordenados[meio - 1]! + ordenados[meio]!) / 2;
}
