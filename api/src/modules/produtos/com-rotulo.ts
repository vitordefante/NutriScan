import type { Product, ProductResult } from '@nutriscan/shared';

import type { DadosAlimento } from '../analise/dados-alimento.js';
import { analisarAlimento } from '../analise/nota.js';
import { analisarCosmetico, type DadosCosmetico } from '../analise-cosmetico/nota.js';
import type { RotuloLido } from '../rotulo/leitura.js';
import type { ResultadoFontes } from './produtos.service.js';
import {
  paraDadosAlimento,
  paraDadosCosmetico,
  paraProduto,
  type ProdutoOff,
} from './open-food-facts.mapper.js';

/**
 * Produto com o que foi lido nas fotos do rótulo. O que veio da foto substitui o da base aberta
 * (lista de ingredientes, valores da tabela); o resto da base é mantido (nome, marca, foto,
 * categorias, selos). Sem cadastro na base, o produto é montado só com a leitura.
 */
export function montarComRotulo(
  barcode: string,
  base: ResultadoFontes | null,
  lido: RotuloLido,
  desatualizado: boolean,
): ProductResult {
  const daBase = base?.dados ?? null;
  const doCadastro: Product = daBase
    ? paraProduto(daBase, lido.tipo)
    : { barcode, tipo: lido.tipo, nome: 'Produto sem nome', categorias: [] };
  const produto: Product = {
    ...doCadastro,
    ...(lido.nome && { nome: lido.nome }),
    ...(lido.ingredientes && { ingredientes: lido.ingredientes }),
  };

  const analise =
    lido.tipo === 'cosmetico'
      ? analisarCosmetico(dadosCosmetico(produto.nome, daBase, lido))
      : analisarAlimento(dadosAlimento(produto.nome, daBase, lido));

  // Com cadastro na base aberta, ela continua sendo a fonte (nome, marca, foto — e a atribuição
  // que a licença dela pede); a leitura da foto entra como complemento.
  return {
    produto,
    analise,
    desatualizado,
    fonte: daBase ? base!.fonte : 'foto',
    rotuloPorFoto: true,
  };
}

function dadosAlimento(nome: string, daBase: ProdutoOff | null, lido: RotuloLido): DadosAlimento {
  const base: DadosAlimento = daBase
    ? paraDadosAlimento(daBase)
    : { nome, categorias: [], selos: [], aditivos: [], nutrientes: {} };
  return {
    ...base,
    nome,
    // Os códigos de aditivos do cadastro vêm da lista antiga: com a lista da foto, valem só os
    // aditivos escritos nela (o motor os reconhece pelo nome).
    ...(lido.ingredientes && { ingredientes: lido.ingredientes, aditivos: [] }),
    ...(lido.nutrientes && {
      nutrientes: { ...base.nutrientes, ...lido.nutrientes },
      // A tabela diz se os valores são por 100 g ou 100 ml — é o que decide se é bebida.
      quantidade: lido.unidade === 'ml' ? '100 ml' : '100 g',
    }),
  };
}

function dadosCosmetico(nome: string, daBase: ProdutoOff | null, lido: RotuloLido): DadosCosmetico {
  const base = daBase ? paraDadosCosmetico(daBase) : { nome, selos: [] };
  return { ...base, nome, ...(lido.ingredientes && { ingredientes: lido.ingredientes }) };
}
