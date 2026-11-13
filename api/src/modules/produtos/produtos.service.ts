import type { LabelSubmission, ProductResult } from '@nutriscan/shared';

import { analisarAlimento } from '../analise/nota.js';
import { analisarCosmetico } from '../analise-cosmetico/nota.js';
import { combinarLeituras, type FotoRotulo, lerEnvio, type RotuloLido } from '../rotulo/leitura.js';
import type { RepositorioRotulos } from '../rotulo/rotulos.repository.js';
import { montarComRotulo } from './com-rotulo.js';
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

export type ResultadoEnvio =
  { ok: true; resultado: ProductResult } | { ok: false; ilegiveis: FotoRotulo[] };

export type ServicoProdutos = {
  /** Produto + análise; null se o produto não existe. Lança FonteIndisponivelError. */
  consultar: (barcode: string) => Promise<ProductResult | null>;
  /**
   * Guarda na base própria o que foi lido nas fotos do rótulo e devolve a nova análise.
   * Se alguma foto não pôde ser lida, nada é guardado.
   */
  enviarRotulo: (barcode: string, envio: LabelSubmission) => Promise<ResultadoEnvio>;
};

type Log = { warn: (obj: object, msg: string) => void };

const DIA_MS = 24 * 60 * 60 * 1000;

type Opcoes = {
  off: ClienteOff;
  /** Open Beauty Facts: consultado quando o Open Food Facts não conhece o código. */
  obf: ClienteOff;
  cache: CacheProdutos;
  /** Base própria: rótulos lidos por foto no app. */
  rotulos: RepositorioRotulos;
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
  rotulos,
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
   * Consulta as duas bases em paralelo (uma fora do ar não derruba a outra, e o cosmético não
   * espera a resposta do OFF). Quem ganha:
   * - cadastro do OFF com dados de alimento (tabela nutricional, NOVA ou Nutri-Score);
   * - senão, o OBF, se conhece o código — o OFF tem cosméticos cadastrados por engano, só com nome;
   * - senão, o cadastro "magro" do OFF.
   * Se nenhuma conhece o código mas uma delas falhou, é erro de fonte: não dá para afirmar que o
   * produto não existe.
   */
  async function buscarNasFontes(barcode: string): Promise<ResultadoFontes> {
    const [alimento, cosmetico] = await Promise.allSettled([
      off.buscarProduto(barcode),
      obf.buscarProduto(barcode),
    ]);
    const doOff = alimento.status === 'fulfilled' ? alimento.value : undefined;
    const doObf = cosmetico.status === 'fulfilled' ? cosmetico.value : undefined;

    if (doObf && !(doOff && temDadosDeAlimento(doOff))) {
      return { fonte: 'open_beauty_facts', dados: doObf };
    }
    if (doOff) return { fonte: 'open_food_facts', dados: doOff };
    if (alimento.status === 'rejected') throw alimento.reason;
    if (cosmetico.status === 'rejected') throw cosmetico.reason;
    return { fonte: 'open_beauty_facts', dados: null };
  }

  /** Cache válido → fontes → cópia antiga do cache (se as fontes estiverem fora do ar). */
  async function consultarBases(
    barcode: string,
  ): Promise<{ resultado: ResultadoFontes; desatualizado: boolean }> {
    const emCache = await lerCache(barcode);
    if (emCache) {
      const validade = emCache.dados ? validadeEncontradoMs : validadeNaoEncontradoMs;
      const idade = agora().getTime() - emCache.atualizadoEm.getTime();
      if (idade < validade) return { resultado: emCache, desatualizado: false };
    }

    let resultado: ResultadoFontes;
    try {
      resultado = await buscarNasFontes(barcode);
    } catch (err) {
      // Fonte fora do ar: uma cópia antiga é melhor que um erro (ex.: durante a demo).
      if (err instanceof FonteIndisponivelError && emCache) {
        log.warn({ err, barcode }, 'Fonte indisponível; usando cópia antiga do cache');
        return { resultado: emCache, desatualizado: true };
      }
      throw err;
    }

    await gravarCache(barcode, resultado);
    return { resultado, desatualizado: false };
  }

  async function lerRotulo(barcode: string): Promise<RotuloLido | null> {
    try {
      return await rotulos.buscar(barcode);
    } catch (err) {
      log.warn({ err, barcode }, 'Falha ao ler a base de rótulos');
      return null;
    }
  }

  async function consultar(barcode: string): Promise<ProductResult | null> {
    const lido = await lerRotulo(barcode);
    if (!lido) {
      const { resultado, desatualizado } = await consultarBases(barcode);
      return montar(resultado, desatualizado);
    }

    // Com o rótulo lido por foto, as bases abertas são só um complemento (nome, marca, foto):
    // se estiverem fora do ar, a análise sai mesmo assim, pela leitura.
    try {
      const { resultado, desatualizado } = await consultarBases(barcode);
      return montarComRotulo(barcode, resultado.dados, lido, desatualizado);
    } catch (err) {
      if (!(err instanceof FonteIndisponivelError)) throw err;
      log.warn({ err, barcode }, 'Fonte indisponível; produto montado só com o rótulo lido');
      return montarComRotulo(barcode, null, lido, true);
    }
  }

  return {
    consultar,

    async enviarRotulo(barcode, envio) {
      const leitura = lerEnvio(envio);
      if (!leitura.ok) return leitura;

      const anterior = await rotulos.buscar(barcode);
      await rotulos.salvar(barcode, combinarLeituras(anterior, leitura.lido), agora());
      // Acabou de ser salvo: a consulta sempre encontra o produto.
      return { ok: true, resultado: (await consultar(barcode))! };
    },
  };
}

function temDadosDeAlimento(p: ProdutoOff): boolean {
  return (
    Object.keys(p.nutriments ?? {}).length > 0 ||
    p.nova_group !== undefined ||
    p.nutriscore_grade !== undefined
  );
}

function montar({ fonte, dados }: ResultadoFontes, desatualizado: boolean): ProductResult | null {
  if (!dados) return null;
  if (fonte === 'open_beauty_facts') {
    return {
      produto: paraProduto(dados, 'cosmetico'),
      analise: analisarCosmetico(paraDadosCosmetico(dados)),
      desatualizado,
      fonte,
    };
  }
  return {
    produto: paraProduto(dados, 'alimento'),
    analise: analisarAlimento(paraDadosAlimento(dados)),
    desatualizado,
    fonte,
  };
}
