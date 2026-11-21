import type { ProducersForProduct } from '@nutriscan/shared';
import type { FastifyPluginAsync } from 'fastify';

import { erro, paramsBarcode } from '../../http/respostas.js';
import { FonteIndisponivelError } from '../produtos/open-food-facts.client.js';
import type { ServicoProdutos } from '../produtos/produtos.service.js';
import { categoriaDoProduto } from './categoria-do-produto.js';
import { ehIdDeFoto } from './fotos.js';
import type { RepositorioProdutores } from './produtores.repository.js';
import { pedidoSchema } from './produtores.schema.js';

export type ProdutoresDeps = {
  produtores: RepositorioProdutores;
  produtos: ServicoProdutos;
};

/** Por endereço: 5 pedidos por hora (o formulário não exige conta). */
const LIMITE_PEDIDOS = { rateLimit: { max: 5, timeWindow: '1 hour' } };

export const produtoresRoutes: FastifyPluginAsync<ProdutoresDeps> = async (
  app,
  { produtores, produtos },
) => {
  /** Todos os produtores do mapa (são poucos: o filtro por categoria e a distância ficam no app). */
  app.get('/produtores', async () => produtores.listar());

  /**
   * Foto de um produtor. O id é o hash do conteúdo — a foto com esse id nunca muda —, então o
   * app (e qualquer proxy) pode guardar a cópia para sempre.
   */
  app.get('/produtores/fotos/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const bytes = ehIdDeFoto(id) ? await produtores.foto(id) : null;
    if (!bytes) {
      return reply.code(404).send(erro('foto_nao_encontrada', 'Essa foto não está mais no mapa.'));
    }
    return reply
      .header('Content-Type', 'image/jpeg')
      .header('Cache-Control', 'public, max-age=31536000, immutable')
      .send(bytes);
  });

  app.get('/produtores/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const produtor = await produtores.buscar(id);
    if (!produtor) {
      return reply
        .code(404)
        .send(erro('produtor_nao_encontrado', 'Esse produtor não está mais no mapa.'));
    }
    return produtor;
  });

  /** "Quero aparecer no mapa": vira um pedido pendente, que o autor confere antes de publicar. */
  app.post('/produtores/pedidos', { config: LIMITE_PEDIDOS }, async (request, reply) => {
    const corpo = pedidoSchema.safeParse(request.body);
    if (!corpo.success) {
      return reply
        .code(400)
        .send(
          erro(
            'dados_invalidos',
            'Confira os campos: nome, ao menos uma categoria, o que vende, onde vende, WhatsApp com DDD e a autorização.',
          ),
        );
    }
    const id = await produtores.criarPedido(corpo.data);
    return reply.code(201).send({ id });
  });

  /** Produtores locais que vendem o que substitui o produto escaneado (ovos → ovos caipira). */
  app.get('/produtos/:barcode/produtores', async (request, reply) => {
    const params = paramsBarcode.safeParse(request.params);
    if (!params.success) {
      return reply
        .code(400)
        .send(erro('codigo_invalido', 'O código de barras deve ter de 8 a 14 dígitos.'));
    }
    try {
      const resultado = await produtos.consultar(params.data.barcode);
      if (!resultado) {
        return reply.code(404).send(erro('produto_nao_encontrado', 'Produto não encontrado.'));
      }
      const categoria = categoriaDoProduto(resultado.produto);
      const lista = categoria
        ? (await produtores.listar()).filter((p) => p.categorias.includes(categoria))
        : [];
      return { categoria, produtores: lista } satisfies ProducersForProduct;
    } catch (err) {
      if (err instanceof FonteIndisponivelError) {
        return reply
          .code(503)
          .send(erro('fonte_indisponivel', 'A base de produtos está fora do ar. Tente de novo.'));
      }
      throw err;
    }
  });
};
