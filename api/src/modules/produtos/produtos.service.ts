import type { ProductResult } from '@nutriscan/shared';

import { analisarAlimento } from '../analise/nota.js';
import { type ClienteOff, FonteIndisponivelError } from './open-food-facts.client.js';
import { paraDadosAlimento, paraProduto, type ProdutoOff } from './open-food-facts.mapper.js';

export type EntradaCache = {
  /** null = a fonte disse que o produto não existe. */
  dados: ProdutoOff | null;
  atualizadoEm: Date;
};

export type CacheProdutos = {
  buscar: (barcode: string) => Promise<EntradaCache | null>;
  salvar: (barcode: string, dados: ProdutoOff | null, atualizadoEm: Date) => Promise<void>;
};

export type ServicoProdutos = {
  /** Produto + análise; null se o produto não existe. Lança FonteIndisponivelError. */
  consultar: (barcode: string) => Promise<ProductResult | null>;
};

type Log = { warn: (obj: object, msg: string) => void };

const DIA_MS = 24 * 60 * 60 * 1000;

type Opcoes = {
  off: ClienteOff;
  cache: CacheProdutos;
  log: Log;
  agora?: () => Date;
  /** Por quanto tempo um produto encontrado é usado sem consultar a fonte de novo. */
  validadeEncontradoMs?: number;
  /** Validade menor para "não encontrado": o produto pode ser cadastrado no OFF a qualquer momento. */
  validadeNaoEncontradoMs?: number;
};

export function criarServicoProdutos({
  off,
  cache,
  log,
  agora = () => new Date(),
  validadeEncontradoMs = 30 * DIA_MS,
  validadeNaoEncontradoMs = 1 * DIA_MS,
}: Opcoes): ServicoProdutos {
  // O cache é uma otimização: se o banco falhar, o scanner continua funcionando pela fonte.
  async function lerCache(barcode: string) {
    try {
      return await cache.buscar(barcode);
    } catch (err) {
      log.warn({ err, barcode }, 'Falha ao ler o cache de produtos');
      return null;
    }
  }

  async function gravarCache(barcode: string, dados: ProdutoOff | null) {
    try {
      await cache.salvar(barcode, dados, agora());
    } catch (err) {
      log.warn({ err, barcode }, 'Falha ao gravar o cache de produtos');
    }
  }

  return {
    async consultar(barcode) {
      const emCache = await lerCache(barcode);
      if (emCache) {
        const validade = emCache.dados ? validadeEncontradoMs : validadeNaoEncontradoMs;
        const idade = agora().getTime() - emCache.atualizadoEm.getTime();
        if (idade < validade) return montar(emCache.dados, false);
      }

      let dados: ProdutoOff | null;
      try {
        dados = await off.buscarProduto(barcode);
      } catch (err) {
        // Fonte fora do ar: uma cópia antiga é melhor que um erro (ex.: durante a demo).
        if (err instanceof FonteIndisponivelError && emCache) {
          log.warn({ err, barcode }, 'Fonte indisponível; usando cópia antiga do cache');
          return montar(emCache.dados, true);
        }
        throw err;
      }

      await gravarCache(barcode, dados);
      return montar(dados, false);
    },
  };
}

function montar(dados: ProdutoOff | null, desatualizado: boolean): ProductResult | null {
  if (!dados) return null;
  return {
    produto: paraProduto(dados),
    analise: analisarAlimento(paraDadosAlimento(dados)),
    desatualizado,
  };
}
