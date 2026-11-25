import type { ItemProposalInput } from '@nutriscan/shared';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { erro } from '../../http/respostas.js';
import { descricaoItem, MAXIMO_ITENS, nomeItem, precoSchema } from '../produtores/catalogo.js';
import { ehIdDeFoto } from '../produtores/fotos.js';
import type { ProdutorDaConta } from './conta-produtor.repository.js';
import { type ServicoContaProdutor } from './conta-produtor.service.js';

export type ContaProdutorDeps = {
  contaProdutor: ServicoContaProdutor;
};

/** Tentar códigos de convite: poucas por minuto (o código já é inadivinhável). */
const LIMITE_VINCULO = { rateLimit: { max: 10, timeWindow: '1 minute' } };
/** Fotos (cada uma passa pelo sharp) e propostas (cada uma é revisada à mão pelo autor). */
const LIMITE_ENVIOS = { rateLimit: { max: 60, timeWindow: '1 hour' } };

const vinculoSchema = z.object({ codigo: z.string().trim().min(4).max(20) });
const fotoSchema = z.object({ imagem: z.string().min(1) });
const propostaSchema = z.object({
  itemId: z.uuid().optional(),
  nome: nomeItem,
  descricao: descricaoItem.optional(),
  preco: precoSchema.optional(),
  fotoId: z.string().refine(ehIdDeFoto).optional(),
  substitui: z.uuid().optional(),
}) satisfies z.ZodType<ItemProposalInput, unknown>;
const ENVIO_JA_ANALISADO = 'Esse envio já foi analisado ou removido.';
const precoCorpoSchema = z.object({ preco: precoSchema.nullable() });

const MENSAGENS_VINCULO = {
  convite_invalido: [400, 'Código inválido ou vencido. Peça um novo ao autor do app.'],
  produtor_ja_vinculado: [409, 'Esse produtor já está ligado a uma conta.'],
  conta_ja_vinculada: [409, 'Esta conta já está ligada a outro produtor.'],
} as const;

export const contaProdutorRoutes: FastifyPluginAsync<ContaProdutorDeps> = async (
  app,
  { contaProdutor: servico },
) => {
  /** O produtor da conta, ou responde 403 (conta comum). */
  async function produtorOu403(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<ProdutorDaConta | null> {
    const produtor = await servico.produtorDaConta(request.user.sub);
    if (!produtor) {
      await reply
        .code(403)
        .send(erro('nao_e_produtor', 'Esta conta não está ligada a um produtor do mapa.'));
    }
    return produtor;
  }
  const comConta = { preHandler: app.exigirConta };

  /** "Sou produtor": liga a conta ao produtor do código de convite. */
  app.post(
    '/produtor/vincular',
    { ...comConta, config: LIMITE_VINCULO },
    async (request, reply) => {
      const corpo = vinculoSchema.safeParse(request.body);
      const r = corpo.success
        ? await servico.vincular(request.user.sub, corpo.data.codigo)
        : 'convite_invalido';
      if (typeof r === 'string') {
        const [codigo, mensagem] = MENSAGENS_VINCULO[r];
        return reply.code(codigo).send(erro(r, mensagem));
      }
      return { produtor: r };
    },
  );

  /** O catálogo como o dono vê: publicados, mudanças e itens novos em análise ou recusados. */
  app.get('/produtor/catalogo', comConta, async (request, reply) => {
    const produtor = await produtorOu403(request, reply);
    if (!produtor) return reply;
    return servico.catalogo(produtor);
  });

  /** Foto de um item (Base64 no JSON): fica privada até o autor aprovar o item. */
  app.post(
    '/produtor/fotos',
    { ...comConta, config: LIMITE_ENVIOS, bodyLimit: 15 * 1024 * 1024 },
    async (request, reply) => {
      const produtor = await produtorOu403(request, reply);
      if (!produtor) return reply;
      const corpo = fotoSchema.safeParse(request.body);
      const r = corpo.success
        ? await servico.enviarFoto(produtor.id, corpo.data.imagem)
        : 'foto_invalida';
      if (r === 'foto_invalida') {
        return reply
          .code(400)
          .send(erro('foto_invalida', 'Não deu para abrir essa foto. Tente outra (JPEG ou PNG).'));
      }
      return reply.code(201).send(r);
    },
  );

  /** Foto pública ou enviada por este produtor (para ele ver o que está em análise). */
  app.get('/produtor/fotos/:id', comConta, async (request, reply) => {
    const produtor = await produtorOu403(request, reply);
    if (!produtor) return reply;
    const { id } = request.params as { id: string };
    const bytes = ehIdDeFoto(id) ? await servico.foto(produtor.id, id) : null;
    if (!bytes) {
      return reply.code(404).send(erro('foto_nao_encontrada', 'Essa foto não existe mais.'));
    }
    return reply
      .header('Content-Type', 'image/jpeg')
      .header('Cache-Control', 'private, max-age=31536000, immutable')
      .send(bytes);
  });

  /** Item novo, ou mudança de nome/descrição/foto de um item: vai para a análise do autor. */
  app.post(
    '/produtor/catalogo/propostas',
    { ...comConta, config: LIMITE_ENVIOS },
    async (request, reply) => {
      const produtor = await produtorOu403(request, reply);
      if (!produtor) return reply;
      const corpo = propostaSchema.safeParse(request.body);
      if (!corpo.success) {
        return reply
          .code(400)
          .send(
            erro(
              'dados_invalidos',
              'Confira o nome (até 60 caracteres), a descrição (até 120) e o preço.',
            ),
          );
      }
      const r = await servico.propor(produtor.id, corpo.data);
      if (r === 'item_nao_encontrado') {
        return reply.code(404).send(erro(r, 'Esse item não está mais no catálogo.'));
      }
      if (r === 'proposta_nao_encontrada') {
        return reply.code(404).send(erro(r, ENVIO_JA_ANALISADO));
      }
      if (r === 'limite_itens') {
        return reply
          .code(409)
          .send(erro(r, `O catálogo comporta até ${MAXIMO_ITENS} itens. Remova algum antes.`));
      }
      if (r === 'foto_invalida') {
        return reply.code(400).send(erro(r, 'Envie a foto de novo.'));
      }
      return reply.code(201).send(r);
    },
  );

  app.delete('/produtor/catalogo/propostas/:id', comConta, async (request, reply) => {
    const produtor = await produtorOu403(request, reply);
    if (!produtor) return reply;
    const { id } = request.params as { id: string };
    if (!(await servico.removerProposta(produtor.id, id))) {
      return reply.code(404).send(erro('proposta_nao_encontrada', ENVIO_JA_ANALISADO));
    }
    return reply.code(204).send();
  });

  /** Preço de um item publicado: muda na hora, sem análise (`null` tira o preço). */
  app.put('/produtor/catalogo/itens/:id/preco', comConta, async (request, reply) => {
    const produtor = await produtorOu403(request, reply);
    if (!produtor) return reply;
    const corpo = precoCorpoSchema.safeParse(request.body);
    if (!corpo.success) {
      return reply
        .code(400)
        .send(erro('dados_invalidos', 'Informe o valor (até R$ 99.999,99) e a unidade.'));
    }
    const { id } = request.params as { id: string };
    if (!(await servico.mudarPreco(produtor.id, id, corpo.data.preco))) {
      return reply
        .code(404)
        .send(erro('item_nao_encontrado', 'Esse item não está mais no catálogo.'));
    }
    return reply.code(204).send();
  });

  /** Tira um item do catálogo na hora (tirar não publica nada novo). */
  app.delete('/produtor/catalogo/itens/:id', comConta, async (request, reply) => {
    const produtor = await produtorOu403(request, reply);
    if (!produtor) return reply;
    const { id } = request.params as { id: string };
    if (!(await servico.removerItem(produtor.id, id))) {
      return reply
        .code(404)
        .send(erro('item_nao_encontrado', 'Esse item não está mais no catálogo.'));
    }
    return reply.code(204).send();
  });
};
