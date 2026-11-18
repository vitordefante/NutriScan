import type { ProducerCategory, ProducerFarming, ProducerPlace } from '@nutriscan/shared';

/** Na ordem do filtro do mapa (a mesma da API e de docs/produtores.md). */
export const CATEGORIAS: readonly ProducerCategory[] = [
  'hortalicas',
  'frutas',
  'ovos',
  'laticinios',
  'carnes',
  'pescados',
  'mel',
  'graos',
  'artesanais',
  'cosmeticos',
];

/** Nome de cada categoria no app (o ícone pixel tem o mesmo nome do código). */
export const NOME_CATEGORIA: Record<ProducerCategory, string> = {
  hortalicas: 'Verduras e legumes',
  frutas: 'Frutas',
  ovos: 'Ovos',
  laticinios: 'Leite e queijos',
  carnes: 'Carnes',
  pescados: 'Peixes e frutos do mar',
  mel: 'Mel',
  graos: 'Grãos e farinhas',
  artesanais: 'Feitos à mão',
  cosmeticos: 'Cosméticos naturais',
};

/** Rótulo curto (filtro e etiquetas). */
export const ROTULO_CATEGORIA: Record<ProducerCategory, string> = {
  hortalicas: 'Verduras',
  frutas: 'Frutas',
  ovos: 'Ovos',
  laticinios: 'Laticínios',
  carnes: 'Carnes',
  pescados: 'Pescados',
  mel: 'Mel',
  graos: 'Grãos',
  artesanais: 'Artesanais',
  cosmeticos: 'Cosméticos',
};

export const CULTIVO: Record<ProducerFarming, { rotulo: string; detalhe: string }> = {
  organico_certificado: { rotulo: 'Orgânico certificado', detalhe: 'Com selo de certificação' },
  agroecologico: {
    rotulo: 'Agroecológico',
    detalhe: 'Declarado pelo produtor, sem certificação',
  },
  convencional: { rotulo: 'Convencional', detalhe: 'Declarado pelo produtor' },
};

export const TIPO_LOCAL: Record<ProducerPlace['tipo'], string> = {
  feira: 'Feira',
  loja: 'Loja',
  propriedade: 'Na propriedade',
};
