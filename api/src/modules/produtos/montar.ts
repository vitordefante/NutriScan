import type { ProductResult } from '@nutriscan/shared';

import { analisarAlimento } from '../analise/nota.js';
import { analisarCosmetico } from '../analise-cosmetico/nota.js';
import { montarNutricao } from '../nutricao/nutricao.js';
import type { RotuloLido } from '../rotulo/leitura.js';
import { montarComRotulo } from './com-rotulo.js';
import { paraDadosAlimento, paraDadosCosmetico, paraProduto } from './open-food-facts.mapper.js';
import type { ResultadoFontes } from './produtos.service.js';

/**
 * Produto + análise a partir do cadastro de uma base aberta; null se a base não conhece o
 * produto. Com rótulo lido por foto, a leitura completa o cadastro (ver `montarComRotulo`).
 */
export function montarResultado(
  { fonte, dados }: ResultadoFontes,
  desatualizado: boolean,
  lido?: RotuloLido | null,
): ProductResult | null {
  if (!dados) return null;
  if (lido) return montarComRotulo(dados.code, { fonte, dados }, lido, desatualizado);
  if (fonte === 'open_beauty_facts') {
    return {
      produto: paraProduto(dados, 'cosmetico'),
      analise: analisarCosmetico(paraDadosCosmetico(dados)),
      desatualizado,
      fonte,
      rotuloPorFoto: false,
    };
  }
  const alimento = paraDadosAlimento(dados);
  const nutricao = montarNutricao(alimento);
  return {
    produto: paraProduto(dados, 'alimento'),
    analise: analisarAlimento(alimento),
    desatualizado,
    fonte,
    rotuloPorFoto: false,
    ...(nutricao && { nutricao }),
  };
}
