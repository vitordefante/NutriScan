import type { ItemProposalInput, MyCatalog, ProducerPhoto, ProducerPrice } from '@nutriscan/shared';

import {
  type FotoGuardada,
  MAXIMO_ITENS,
  paraItemPublico,
  paraProposta,
} from '../produtores/catalogo.js';
import { prepararFoto } from '../produtores/fotos.js';
import type {
  ProdutorDaConta,
  RepositorioContaProdutor,
  ResultadoVinculo,
} from './conta-produtor.repository.js';
import { hashDoCodigo } from './convite.js';

/** Foto enviada pelo app: o recorte quadrado do iPhone em JPEG passa folgado disso. */
export const MAXIMO_BYTES_FOTO = 10 * 1024 * 1024;

export type ServicoContaProdutor = {
  produtorDaConta: (usuarioId: string) => Promise<ProdutorDaConta | null>;
  vincular: (usuarioId: string, codigo: string) => Promise<ResultadoVinculo>;
  catalogo: (produtor: ProdutorDaConta) => Promise<MyCatalog>;
  /** Base64 do JPEG/PNG/WebP (com ou sem o prefixo "data:"). */
  enviarFoto: (produtorId: string, base64: string) => Promise<ProducerPhoto | 'foto_invalida'>;
  foto: (produtorId: string, id: string) => Promise<Buffer | null>;
  propor: (
    produtorId: string,
    entrada: ItemProposalInput,
  ) => Promise<
    | { id: string }
    | 'item_nao_encontrado'
    | 'proposta_nao_encontrada'
    | 'limite_itens'
    | 'foto_invalida'
  >;
  mudarPreco: (produtorId: string, itemId: string, preco: ProducerPrice | null) => Promise<boolean>;
  removerItem: (produtorId: string, itemId: string) => Promise<boolean>;
  removerProposta: (produtorId: string, id: string) => Promise<boolean>;
};

export function criarServicoContaProdutor(
  repo: RepositorioContaProdutor,
  agora: () => Date = () => new Date(),
): ServicoContaProdutor {
  return {
    produtorDaConta: (usuarioId) => repo.produtorDaConta(usuarioId),

    vincular: (usuarioId, codigo) => repo.vincular(usuarioId, hashDoCodigo(codigo), agora()),

    async catalogo(produtor) {
      const [itens, propostas] = await Promise.all([
        repo.itens(produtor.id),
        repo.propostas(produtor.id),
      ]);
      const mudancas = new Map(propostas.filter((p) => p.itemId).map((p) => [p.itemId!, p]));
      return {
        produtor,
        itens: itens.map((i) => {
          const mudanca = mudancas.get(i.id);
          return {
            id: i.id,
            ...paraItemPublico(i),
            ...(mudanca && { alteracao: paraProposta(mudanca) }),
          };
        }),
        novos: propostas.filter((p) => !p.itemId).map(paraProposta),
        limite: MAXIMO_ITENS,
      };
    },

    async enviarFoto(produtorId, base64) {
      const bytes = Buffer.from(base64.replace(/^data:[^,]*,/, ''), 'base64');
      if (bytes.length === 0 || bytes.length > MAXIMO_BYTES_FOTO) return 'foto_invalida';
      let foto;
      try {
        // Reduz, gira conforme o celular e apaga os metadados (o EXIF pode ter o GPS).
        foto = await prepararFoto(bytes);
      } catch {
        return 'foto_invalida';
      }
      await repo.salvarFoto(produtorId, foto, agora());
      return { id: foto.id, largura: foto.largura, altura: foto.altura };
    },

    async foto(produtorId, id) {
      return (await repo.foto(produtorId, id))?.bytes ?? null;
    },

    async propor(produtorId, entrada) {
      const itens = await repo.itens(produtorId);
      const item = entrada.itemId ? itens.find((i) => i.id === entrada.itemId) : undefined;
      if (entrada.itemId && !item) return 'item_nao_encontrado';

      // Corrigir um item novo não aumenta o catálogo: o envio corrigido sai da conta.
      const substitui = item ? undefined : entrada.substitui;
      if (!item) {
        const propostas = await repo.propostas(produtorId);
        const novosEmAnalise = propostas.filter(
          (p) => !p.itemId && p.situacao === 'em_analise' && p.id !== substitui,
        );
        if (itens.length + novosEmAnalise.length >= MAXIMO_ITENS) return 'limite_itens';
      }

      let foto: FotoGuardada | null = null;
      if (entrada.fotoId) {
        if (item?.foto?.id === entrada.fotoId) {
          foto = item.foto;
        } else {
          // Só uma foto que este produtor enviou (não a galeria de outro, nem as importadas,
          // que não guardam o tamanho).
          const f = await repo.foto(produtorId, entrada.fotoId);
          if (!f?.propria) return 'foto_invalida';
          foto = { id: f.id, largura: f.largura, altura: f.altura };
        }
      }

      const id = await repo.propor(
        {
          produtorId,
          itemId: item?.id ?? null,
          nome: entrada.nome,
          descricao: entrada.descricao ?? null,
          // O preço de um item publicado muda direto (mudarPreco); a proposta só leva o do novo.
          precoCentavos: item ? null : (entrada.preco?.centavos ?? null),
          unidade: item ? null : (entrada.preco?.unidade ?? null),
          foto,
          enviadaEm: agora(),
        },
        substitui,
      );
      return id === null ? 'proposta_nao_encontrada' : { id };
    },

    mudarPreco: (produtorId, itemId, preco) => repo.mudarPreco(produtorId, itemId, preco, agora()),

    removerItem: (produtorId, itemId) => repo.removerItem(produtorId, itemId),

    removerProposta: (produtorId, id) => repo.removerProposta(produtorId, id),
  };
}
