import type { Producer, ProducerRequest, ProducersForProduct } from '@nutriscan/shared';

import { chamarApi, urlDaApi } from './api';

/** GET /produtores — todos os produtores do mapa. */
export function listarProdutores(signal?: AbortSignal): Promise<Producer[]> {
  return chamarApi('/produtores', { signal });
}

/** GET /produtores/:id. Erro: produtor_nao_encontrado. */
export function buscarProdutor(id: string, signal?: AbortSignal): Promise<Producer> {
  return chamarApi(`/produtores/${encodeURIComponent(id)}`, { signal });
}

/** GET /produtos/:barcode/produtores — quem vende o que substitui o produto. */
export function produtoresDoProduto(
  barcode: string,
  signal?: AbortSignal,
): Promise<ProducersForProduct> {
  return chamarApi(`/produtos/${barcode}/produtores`, { signal });
}

/** POST /produtores/pedidos — "Quero aparecer no mapa". Erros: dados_invalidos, muitas_tentativas. */
export function enviarPedido(pedido: ProducerRequest): Promise<{ id: string }> {
  return chamarApi('/produtores/pedidos', { metodo: 'POST', corpo: pedido });
}

/** GET /produtores/fotos/:id — a foto não muda (o id é o hash), então o app guarda em cache. */
export function urlFotoProdutor(id: string): string | null {
  return urlDaApi(`/produtores/fotos/${id}`);
}
