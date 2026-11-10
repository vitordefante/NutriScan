import type { DadosAlimento } from '../dados-alimento.js';
import { paraDadosAlimento, produtoOffSchema } from '../../produtos/open-food-facts.mapper.js';
import amostra from './off-amostra.json' with { type: 'json' };

/** Monta um alimento de teste: só os campos informados, o resto vazio. */
export function alimento(campos: Partial<DadosAlimento> = {}): DadosAlimento {
  return {
    nome: 'Produto de teste',
    categorias: [],
    selos: [],
    aditivos: [],
    nutrientes: {},
    ...campos,
  };
}

/** Um produto real da amostra do Open Food Facts, já convertido para a entrada do motor. */
export function produtoReal(codigo: string): DadosAlimento {
  const bruto = amostra.produtos.find((p) => p.code === codigo);
  if (!bruto) throw new Error(`Produto ${codigo} não está em off-amostra.json`);
  return paraDadosAlimento(produtoOffSchema.parse(bruto));
}

export const codigosDaAmostra = amostra.produtos.map((p) => p.code);
