import type { ItemProposalInput, MyCatalog, ProducerPhoto, ProducerPrice } from '@nutriscan/shared';

import { chamarApi, urlDaApi } from './api';

/** Área do produtor (Perfil → Meu catálogo). Todas as rotas exigem a conta ligada ao produtor. */

/** POST /produtor/vincular. Erros: convite_invalido, produtor_ja_vinculado, conta_ja_vinculada. */
export function vincular(
  token: string,
  codigo: string,
): Promise<{ produtor: MyCatalog['produtor'] }> {
  return chamarApi('/produtor/vincular', { metodo: 'POST', corpo: { codigo }, token });
}

/** GET /produtor/catalogo. Erro nao_e_produtor = conta comum. */
export function meuCatalogo(token: string, signal?: AbortSignal): Promise<MyCatalog> {
  return chamarApi('/produtor/catalogo', { token, ...(signal && { signal }) });
}

/** POST /produtor/fotos — a foto fica privada até o autor aprovar o item. */
export function enviarFoto(token: string, base64: string): Promise<ProducerPhoto> {
  // Foto do celular pela rede móvel: mais tempo que as outras chamadas.
  return chamarApi('/produtor/fotos', {
    metodo: 'POST',
    corpo: { imagem: base64 },
    token,
    tempoLimiteMs: 60_000,
  });
}

/** Item novo ou mudança de nome/descrição/foto (vai para análise). */
export function propor(token: string, entrada: ItemProposalInput): Promise<{ id: string }> {
  return chamarApi('/produtor/catalogo/propostas', { metodo: 'POST', corpo: entrada, token });
}

export function cancelarProposta(token: string, id: string): Promise<void> {
  return chamarApi(`/produtor/catalogo/propostas/${id}`, { metodo: 'DELETE', token });
}

/** Preço muda na hora; null tira o preço. */
export function mudarPreco(token: string, itemId: string, preco: ProducerPrice | null) {
  return chamarApi<void>(`/produtor/catalogo/itens/${itemId}/preco`, {
    metodo: 'PUT',
    corpo: { preco },
    token,
  });
}

export function removerItem(token: string, itemId: string): Promise<void> {
  return chamarApi(`/produtor/catalogo/itens/${itemId}`, { metodo: 'DELETE', token });
}

/** Foto de um item do próprio catálogo (inclusive as ainda em análise), com o login. */
export function fonteFotoPrivada(id: string, token: string) {
  const uri = urlDaApi(`/produtor/fotos/${id}`);
  return uri ? { uri, headers: { Authorization: `Bearer ${token}` } } : null;
}
