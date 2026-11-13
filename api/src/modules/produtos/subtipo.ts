/**
 * Categoria curta em português para a etiqueta de subtipo da tela de resultado
 * (ex.: ALIMENTO · BISCOITOS).
 *
 * As categorias do Open Food Facts vêm da mais geral para a mais específica
 * (ex.: "en:snacks" … "en:biscuits", "en:filled-biscuits"). Percorremos de trás para a frente
 * e usamos a primeira que está no dicionário. As tags "pt:" são ignoradas: são texto livre
 * dos colaboradores e às vezes trazem lixo (ex.: "pt:Processado").
 */
const NOMES: Record<string, string> = {
  // Cereais, massas e pães
  'en:breakfast-cereals': 'Cereal matinal',
  'en:rolled-oats': 'Aveia',
  'en:granolas': 'Granola',
  'en:cereal-bars': 'Barra de cereal',
  'en:protein-bars': 'Barra de proteína',
  'en:pastas': 'Massa',
  'en:instant-noodles': 'Macarrão instantâneo',
  'en:breads': 'Pão',
  'en:rices': 'Arroz',
  'en:flours': 'Farinha',
  'en:corn-starch': 'Amido de milho',
  // Leguminosas e oleaginosas
  'en:common-beans': 'Feijão',
  'en:legumes': 'Leguminosa',
  'en:peanut-butters': 'Pasta de amendoim',
  'en:nuts': 'Castanhas',
  // Doces e lanches
  'en:biscuits': 'Biscoito',
  'en:filled-biscuits': 'Biscoito recheado',
  'en:cakes': 'Bolo',
  'en:chocolates': 'Chocolate',
  'en:cocoa-and-hazelnuts-spreads': 'Creme de avelã',
  'en:candies': 'Bala e doce',
  'en:ice-creams': 'Sorvete',
  'en:crisps': 'Salgadinho',
  'en:salty-snacks': 'Salgadinho',
  'en:honeys': 'Mel',
  'en:sugars': 'Açúcar',
  // Laticínios e ovos
  'en:milks': 'Leite',
  'en:condensed-milks': 'Leite condensado',
  'en:creams': 'Creme de leite',
  'en:cheeses': 'Queijo',
  'en:yogurts': 'Iogurte',
  'en:butters': 'Manteiga',
  'en:eggs': 'Ovos',
  // Bebidas
  'en:sodas': 'Refrigerante',
  'en:fruit-juices': 'Suco',
  'en:waters': 'Água',
  'en:coffees': 'Café',
  'en:teas': 'Chá',
  'en:instant-chocolate-powders': 'Achocolatado',
  // Carnes, gorduras e temperos
  'en:sausages': 'Embutido',
  'en:hams': 'Presunto',
  'en:meats': 'Carne',
  'en:fishes': 'Peixe',
  'en:vegetable-oils': 'Óleo',
  'en:olive-oils': 'Azeite',
  'en:salts': 'Sal',
};

/**
 * Categorias amplas que o cadastro colaborativo às vezes acrescenta DEPOIS de uma mais precisa
 * (ex.: creme de leite marcado também como "en:milks"). Só são usadas se nenhuma outra
 * categoria conhecida aparecer.
 */
const GENERICAS = new Set(['en:milks']);

export function subtipoDasCategorias(categorias: readonly string[]): string | undefined {
  let generica: string | undefined;
  for (let i = categorias.length - 1; i >= 0; i--) {
    const categoria = categorias[i]!;
    const nome = NOMES[categoria];
    if (!nome) continue;
    if (!GENERICAS.has(categoria)) return nome;
    generica ??= nome;
  }
  return generica;
}
