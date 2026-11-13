import type { ProductResult } from '@nutriscan/shared';

import { analisarAlimento } from '../analise/nota.js';
import { analisarCosmetico } from '../analise-cosmetico/nota.js';
import { type ClienteOff, FonteIndisponivelError } from './open-food-facts.client.js';
import {
  paraDadosAlimento,
  paraDadosCosmetico,
  paraProduto,
  type ProdutoOff,
} from './open-food-facts.mapper.js';

/** Alimentos vêm do Open Food Facts; cosméticos, do Open Beauty Facts. */
export type FonteProduto = 'open_food_facts' | 'open_beauty_facts';

/** O que uma consulta às fontes devolveu. */
export type ResultadoFontes = {
  fonte: FonteProduto;
  /** null = nenhuma das fontes conhece o produto. */
  dados: ProdutoOff | null;
};

export type EntradaCache = ResultadoFontes & { atualizadoEm: Date };

export type CacheProdutos = {
  buscar: (barcode: string) => Promise<EntradaCache | null>;
  salvar: (barcode: string, resultado: ResultadoFontes, atualizadoEm: Date) => Promise<void>;
};

export type ServicoProdutos = {
  /** Produto + análise; null se o produto não existe. Lança FonteIndisponivelError. */
  consultar: (barcode: string) => Promise<ProductResult | null>;
};

type Log = { warn: (obj: object, msg: string) => void };

const DIA_MS = 24 * 60 * 60 * 1000;

type Opcoes = {
  off: ClienteOff;
  /** Open Beauty Facts: consultado quando o Open Food Facts não conhece o código. */
  obf: ClienteOff;
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
  obf,
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

  async function gravarCache(barcode: string, resultado: ResultadoFontes) {
    try {
      await cache.salvar(barcode, resultado, agora());
    } catch (err) {
      log.warn({ err, barcode }, 'Falha ao gravar o cache de produtos');
    }
  }

  /**
   * Alimento primeiro (a maior parte das leituras); se o Open Food Facts não conhece o código,
   * tenta o Open Beauty Facts. Se o OFF diz "não encontrado" mas o OBF está fora do ar, é erro de
   * fonte — não dá para afirmar que o produto não existe.
   */
  async function buscarNasFontes(barcode: string): Promise<ResultadoFontes> {
    const alimento = await off.buscarProduto(barcode);
    if (alimento) return { fonte: 'open_food_facts', dados: alimento };
    return { fonte: 'open_beauty_facts', dados: await obf.buscarProduto(barcode) };
  }

  return {
    async consultar(barcode) {
      const emCache = await lerCache(barcode);
      if (emCache) {
        const validade = emCache.dados ? validadeEncontradoMs : validadeNaoEncontradoMs;
        const idade = agora().getTime() - emCache.atualizadoEm.getTime();
        if (idade < validade) return montar(emCache, false);
      }

      let resultado: ResultadoFontes;
      try {
        resultado = await buscarNasFontes(barcode);
      } catch (err) {
        // Fonte fora do ar: uma cópia antiga é melhor que um erro (ex.: durante a demo).
        if (err instanceof FonteIndisponivelError && emCache) {
          log.warn({ err, barcode }, 'Fonte indisponível; usando cópia antiga do cache');
          return montar(emCache, true);
        }
        throw err;
      }

      await gravarCache(barcode, resultado);
      return montar(resultado, false);
    },
  };
}

function montar({ fonte, dados }: ResultadoFontes, desatualizado: boolean): ProductResult | null {
  if (!dados) return null;
  if (fonte === 'open_beauty_facts') {
    return {
      produto: paraProduto(dados, 'cosmetico'),
      analise: analisarCosmetico(paraDadosCosmetico(dados)),
      desatualizado,
    };
  }
  return {
    produto: paraProduto(dados, 'alimento'),
    analise: analisarAlimento(paraDadosAlimento(dados)),
    desatualizado,
  };
}
