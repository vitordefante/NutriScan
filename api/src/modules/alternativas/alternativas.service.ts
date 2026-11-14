import type { AlternativesResult, ProductResult } from '@nutriscan/shared';

import { montarResultado } from '../produtos/montar.js';
import { paraDadosAlimento } from '../produtos/open-food-facts.mapper.js';
import {
  type ClienteBusca,
  FonteIndisponivelError,
  type ResultadoBusca,
} from '../produtos/open-food-facts.client.js';
import type { FonteProduto, ServicoProdutos } from '../produtos/produtos.service.js';
import type { RotuloLido } from '../rotulo/leitura.js';
import type { RepositorioRotulos } from '../rotulo/rotulos.repository.js';
import type { CacheBuscas } from './buscas.repository.js';
import { categoriasParaComparar, nomeDaCategoria } from './categorias.js';
import { escolherAlternativas, type Referencia } from './escolha.js';
import { cadastrosSuspeitos } from './plausibilidade.js';

/** Candidato analisado + a energia por 100 g usada na checagem de plausibilidade. */
type Candidato = { resultado: ProductResult; energiaKcal?: number; porcaoG?: number };

export type ServicoAlternativas = {
  /**
   * Produtos da mesma categoria, vendidos no Brasil, com nota maior; null se o produto não
   * existe. Lança FonteIndisponivelError se a base está fora do ar e a busca não está em cache.
   */
  consultar: (barcode: string) => Promise<AlternativesResult | null>;
};

type Log = { warn: (obj: object, msg: string) => void };

const DIA_MS = 24 * 60 * 60 * 1000;

type Opcoes = {
  produtos: ServicoProdutos;
  /** Busca de alimentos (Open Food Facts) e de cosméticos (Open Beauty Facts). */
  busca: Record<FonteProduto, ClienteBusca>;
  cache: CacheBuscas;
  /** Base própria: a leitura das fotos completa os candidatos, como no scan. */
  rotulos: RepositorioRotulos;
  log: Log;
  agora?: () => Date;
  /** Por quanto tempo uma busca é usada sem consultar a base de novo. */
  validadeMs?: number;
};

export function criarServicoAlternativas({
  produtos,
  busca,
  cache,
  rotulos,
  log,
  agora = () => new Date(),
  validadeMs = 7 * DIA_MS,
}: Opcoes): ServicoAlternativas {
  /**
   * Buscas em andamento: dois pedidos da mesma categoria ao mesmo tempo (ex.: duas pessoas
   * escaneando o mesmo produto) dividem uma consulta só — o limite de buscas da base é baixo.
   */
  const emAndamento = new Map<string, Promise<ResultadoBusca>>();

  function buscarCategoria(fonte: FonteProduto, categoria: string): Promise<ResultadoBusca> {
    const chave = `${fonte}:${categoria}`;
    let pedido = emAndamento.get(chave);
    if (!pedido) {
      pedido = buscarCategoriaSemRepetir(fonte, categoria).finally(() => emAndamento.delete(chave));
      emAndamento.set(chave, pedido);
    }
    return pedido;
  }

  /** Cache válido → base → cópia antiga do cache (se a base estiver fora do ar). */
  async function buscarCategoriaSemRepetir(
    fonte: FonteProduto,
    categoria: string,
  ): Promise<ResultadoBusca> {
    const emCache = await cache.buscar(fonte, categoria).catch((err: unknown) => {
      log.warn({ err, categoria }, 'Falha ao ler o cache de buscas');
      return null;
    });
    if (emCache && agora().getTime() - emCache.atualizadoEm.getTime() < validadeMs) return emCache;

    let resultado: ResultadoBusca;
    try {
      resultado = await busca[fonte].buscarPorCategoria(categoria);
    } catch (err) {
      if (err instanceof FonteIndisponivelError && emCache) {
        log.warn({ err, categoria }, 'Busca indisponível; usando cópia antiga do cache');
        return emCache;
      }
      throw err;
    }
    await cache.salvar(fonte, categoria, resultado, agora()).catch((err: unknown) => {
      log.warn({ err, categoria }, 'Falha ao gravar o cache de buscas');
    });
    return resultado;
  }

  /** Cada candidato analisado pelo mesmo motor da nota, com a leitura de foto se houver. */
  async function analisar(
    fonte: FonteProduto,
    { produtos: lista }: ResultadoBusca,
  ): Promise<Candidato[]> {
    const lidos = await rotulos
      .buscarVarios(lista.map((p) => p.code))
      .catch((err: unknown): Map<string, RotuloLido> => {
        log.warn({ err }, 'Falha ao ler a base de rótulos');
        return new Map();
      });
    return lista.flatMap((dados) => {
      const lido = lidos.get(dados.code);
      const resultado = montarResultado({ fonte, dados }, false, lido);
      if (!resultado) return [];
      // A checagem é da tabela do cadastro. Fica de fora: cosmético (não tem tabela) e tabela
      // lida por foto (já passou pela checagem de coerência da leitura).
      if (fonte !== 'open_food_facts' || lido?.nutrientes) return [{ resultado }];
      const energiaKcal = paraDadosAlimento(dados).nutrientes.energiaKcal;
      return [
        {
          resultado,
          ...(energiaKcal !== undefined && { energiaKcal }),
          ...(dados.serving_quantity !== undefined && { porcaoG: dados.serving_quantity }),
        },
      ];
    });
  }

  return {
    async consultar(barcode) {
      const atual = await produtos.consultar(barcode);
      if (!atual) return null;

      const categorias = categoriasParaComparar(atual.produto.categorias);
      if (categorias.length === 0) return { status: 'sem_categoria' };

      const fonte: FonteProduto =
        atual.produto.tipo === 'cosmetico' ? 'open_beauty_facts' : 'open_food_facts';
      const referencia = paraReferencia(atual);

      // Da categoria mais específica para a mais geral. A de cima é sempre consultada: é nela
      // que costuma estar a opção menos processada (achocolatado → "cacau e chocolate em pó",
      // onde está o cacau 100%) — as duas buscas saem juntas, para a resposta não demorar o
      // dobro. Mais um nível só se ainda não houver nenhuma alternativa. Um nível que falhar
      // fica de fora e a resposta sai marcada como incompleta.
      const buscar = (categoria: string) =>
        buscarCategoria(fonte, categoria).then(
          (r) => ({ ok: true as const, r }),
          (err: unknown) => ({ ok: false as const, err }),
        );
      const adiantadas = categorias.slice(0, 2).map(buscar);

      const candidatos = new Map<string, ProductResult>();
      const suspeitos = new Set<string>();
      let resposta: Extract<AlternativesResult, { status: 'ok' }> | null = null;
      let primeiroErro: unknown;
      for (const [nivel, categoria] of categorias.entries()) {
        const busca = await (adiantadas[nivel] ?? buscar(categoria));
        if (!busca.ok) {
          if (!(busca.err instanceof FonteIndisponivelError)) throw busca.err;
          primeiroErro ??= busca.err;
          continue;
        }

        const desteNivel = await analisar(fonte, busca.r);
        // Valores fora do padrão da categoria (ex.: porção digitada como 100 g) não são
        // sugeridos: a nota deles não é confiável. A mediana é a desta busca.
        for (const b of cadastrosSuspeitos(
          desteNivel.map((c) => ({
            barcode: c.resultado.produto.barcode,
            ...(c.energiaKcal !== undefined && { energiaKcal: c.energiaKcal }),
            ...(c.porcaoG !== undefined && { porcaoG: c.porcaoG }),
          })),
        )) {
          suspeitos.add(b);
        }
        for (const { resultado } of desteNivel) {
          if (!candidatos.has(resultado.produto.barcode)) {
            candidatos.set(resultado.produto.barcode, resultado);
          }
        }

        const todos = [...candidatos.values()];
        const { comparados, alternativas } = escolherAlternativas(
          referencia,
          todos.filter((r) => !suspeitos.has(r.produto.barcode)),
        );
        // Ignorados = os que seriam comparados (nota completa, não repetidos) sem a checagem.
        const semChecagem = escolherAlternativas(referencia, todos).comparados;
        const nome = nomeDaCategoria(categoria);
        resposta = {
          status: 'ok',
          ...(nome && { categoria: nome }),
          referencia: referencia.nota,
          comparados,
          ignorados: Math.max(0, semChecagem - comparados),
          incompleta: false,
          alternativas,
        };
        if (nivel >= 1 && alternativas.length > 0) break;
      }

      if (!resposta) throw primeiroErro;
      // Uma busca falhou (antes ou depois da que respondeu): a lista pode estar incompleta.
      resposta.incompleta = primeiroErro !== undefined;
      return resposta;
    },
  };
}

function paraReferencia({ produto, analise }: ProductResult): Referencia {
  return {
    barcode: produto.barcode,
    nome: produto.nome,
    ...(produto.marca && { marca: produto.marca }),
    categorias: produto.categorias,
    nota: analise.status === 'dados_insuficientes' ? null : analise.nota,
  };
}
