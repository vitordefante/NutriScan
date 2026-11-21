import type { MyCatalog } from '@nutriscan/shared';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import { buildApp } from '../../app.js';
import { contaProdutorEmMemoria, depsDeTeste } from '../../test/deps.js';
import type { LinhaItem } from '../produtores/catalogo.js';
import { criarServicoContaProdutor } from './conta-produtor.service.js';
import { gerarCodigo, hashDoCodigo, normalizarCodigo } from './convite.js';

const AGORA = new Date('2026-11-21T12:00:00Z');
const DEPOIS = new Date('2026-11-30T12:00:00Z');

function item(id: string, produtorId: string, extra: Partial<LinhaItem> = {}): LinhaItem {
  return {
    id,
    produtorId,
    nome: `Item ${id.slice(-2)}`,
    descricao: null,
    precoCentavos: null,
    unidade: null,
    precoAtualizadoEm: null,
    foto: null,
    ordem: 0,
    ...extra,
  };
}

const ITEM_A = '40000000-0000-4000-8000-0000000000a1';
const ITEM_B = '40000000-0000-4000-8000-0000000000b1';

/** App com dois produtores (fazenda tem um item; sítio, outro) e um convite para a fazenda. */
async function montar(agora = AGORA) {
  const repo = contaProdutorEmMemoria();
  repo.estado.produtores.push({ id: 'fazenda', nome: 'Fazenda' }, { id: 'sitio', nome: 'Sítio' });
  repo.estado.itens.push(
    item(ITEM_A, 'fazenda', { nome: 'Leite', precoCentavos: 900, unidade: 'litro' }),
    item(ITEM_B, 'sitio'),
  );
  repo.estado.convites.set(hashDoCodigo('K7M2-QX9P'), {
    produtorId: 'fazenda',
    expiraEm: new Date('2026-11-28T12:00:00Z'),
  });
  const app = buildApp(
    depsDeTeste({ contaProdutor: criarServicoContaProdutor(repo, () => agora) }),
  );
  const conta = async (email: string) => {
    const r = await app.inject({
      method: 'POST',
      url: '/contas',
      payload: { email, senha: 'senha-de-teste' },
    });
    return { authorization: `Bearer ${r.json().token as string}` };
  };
  return { app, repo, conta };
}

/** Conta já ligada à fazenda. */
async function produtorPronto() {
  const m = await montar();
  const headers = await m.conta('fazenda@exemplo.com');
  await m.app.inject({
    method: 'POST',
    url: '/produtor/vincular',
    headers,
    payload: { codigo: 'K7M2-QX9P' },
  });
  return { ...m, headers };
}

const jpegBase64 = async () =>
  (
    await sharp({ create: { width: 800, height: 800, channels: 3, background: '#cc8844' } })
      .jpeg()
      .toBuffer()
  ).toString('base64');

describe('código de convite', () => {
  it('tem 8 caracteres sem os que se confundem, e o hash ignora caixa, espaço e hífen', () => {
    const codigo = gerarCodigo();
    expect(codigo).toMatch(/^[A-HJ-KM-NP-Z2-9]{4}-[A-HJ-KM-NP-Z2-9]{4}$/);
    expect(normalizarCodigo(' k7m2 qx9p ')).toBe('K7M2QX9P');
    expect(hashDoCodigo('k7m2qx9p')).toBe(hashDoCodigo('K7M2-QX9P'));
  });
});

describe('ligar a conta ao produtor', () => {
  it('sem conta: 401', async () => {
    const { app } = await montar();
    const r = await app.inject({
      method: 'POST',
      url: '/produtor/vincular',
      payload: { codigo: 'K7M2-QX9P' },
    });
    expect(r.statusCode).toBe(401);
  });

  it('o código vale uma vez (digitado de qualquer jeito)', async () => {
    const { app, conta } = await montar();
    const primeira = await app.inject({
      method: 'POST',
      url: '/produtor/vincular',
      headers: await conta('a@exemplo.com'),
      payload: { codigo: 'k7m2 qx9p' },
    });
    expect(primeira.json()).toEqual({ produtor: { id: 'fazenda', nome: 'Fazenda' } });

    const segunda = await app.inject({
      method: 'POST',
      url: '/produtor/vincular',
      headers: await conta('b@exemplo.com'),
      payload: { codigo: 'K7M2-QX9P' },
    });
    expect(segunda.statusCode).toBe(400);
    expect(segunda.json().erro).toBe('convite_invalido');
  });

  it('código vencido ou errado: 400', async () => {
    const vencido = await montar(DEPOIS);
    const r1 = await vencido.app.inject({
      method: 'POST',
      url: '/produtor/vincular',
      headers: await vencido.conta('a@exemplo.com'),
      payload: { codigo: 'K7M2-QX9P' },
    });
    const { app, conta } = await montar();
    const r2 = await app.inject({
      method: 'POST',
      url: '/produtor/vincular',
      headers: await conta('a@exemplo.com'),
      payload: { codigo: 'AAAA-BBBB' },
    });
    expect([r1.statusCode, r2.statusCode]).toEqual([400, 400]);
  });

  it('uma conta liga a um produtor só', async () => {
    const { app, repo, headers } = await produtorPronto();
    repo.estado.convites.set(hashDoCodigo('SSSS-SSSS'), {
      produtorId: 'sitio',
      expiraEm: DEPOIS,
    });
    const r = await app.inject({
      method: 'POST',
      url: '/produtor/vincular',
      headers,
      payload: { codigo: 'SSSS-SSSS' },
    });
    expect(r.statusCode).toBe(409);
    expect(r.json().erro).toBe('conta_ja_vinculada');
  });

  it('conta comum não vê a área do produtor: 403', async () => {
    const { app, conta } = await montar();
    const r = await app.inject({
      method: 'GET',
      url: '/produtor/catalogo',
      headers: await conta('a@exemplo.com'),
    });
    expect(r.statusCode).toBe(403);
    expect(r.json().erro).toBe('nao_e_produtor');
  });
});

describe('catálogo pelo app', () => {
  it('item novo vai para análise e não entra no catálogo publicado', async () => {
    const { app, repo, headers } = await produtorPronto();
    const r = await app.inject({
      method: 'POST',
      url: '/produtor/catalogo/propostas',
      headers,
      payload: {
        nome: 'Kefir',
        descricao: 'Pacote de 500 ml',
        preco: { centavos: 1400, unidade: 'pacote' },
      },
    });
    expect(r.statusCode).toBe(201);
    expect(repo.estado.itens.filter((i) => i.produtorId === 'fazenda')).toHaveLength(1);

    const catalogo = (
      await app.inject({ method: 'GET', url: '/produtor/catalogo', headers })
    ).json() as MyCatalog;
    expect(catalogo.itens.map((i) => i.nome)).toEqual(['Leite']);
    expect(catalogo.novos).toEqual([
      {
        id: r.json().id,
        nome: 'Kefir',
        descricao: 'Pacote de 500 ml',
        preco: { centavos: 1400, unidade: 'pacote' },
        situacao: 'em_analise',
        enviadaEm: AGORA.toISOString(),
      },
    ]);
  });

  it('mudança de um item: a nova substitui a anterior, e o preço não vai junto', async () => {
    const { app, repo, headers } = await produtorPronto();
    for (const nome of ['Leite integral', 'Leite orgânico']) {
      await app.inject({
        method: 'POST',
        url: '/produtor/catalogo/propostas',
        headers,
        payload: { itemId: ITEM_A, nome, preco: { centavos: 1, unidade: 'kg' } },
      });
    }
    expect(repo.estado.propostas).toHaveLength(1);
    expect(repo.estado.propostas[0]).toMatchObject({
      itemId: ITEM_A,
      nome: 'Leite orgânico',
      precoCentavos: null,
    });
    const catalogo = (
      await app.inject({ method: 'GET', url: '/produtor/catalogo', headers })
    ).json() as MyCatalog;
    // O publicado continua como estava até a aprovação.
    expect(catalogo.itens[0]).toMatchObject({
      nome: 'Leite',
      alteracao: { nome: 'Leite orgânico', situacao: 'em_analise' },
    });
  });

  it('não mexe em item de outro produtor', async () => {
    const { app, headers } = await produtorPronto();
    const proposta = await app.inject({
      method: 'POST',
      url: '/produtor/catalogo/propostas',
      headers,
      payload: { itemId: ITEM_B, nome: 'Meu agora' },
    });
    const preco = await app.inject({
      method: 'PUT',
      url: `/produtor/catalogo/itens/${ITEM_B}/preco`,
      headers,
      payload: { preco: { centavos: 100, unidade: 'kg' } },
    });
    const remover = await app.inject({
      method: 'DELETE',
      url: `/produtor/catalogo/itens/${ITEM_B}`,
      headers,
    });
    expect([proposta.statusCode, preco.statusCode, remover.statusCode]).toEqual([404, 404, 404]);
  });

  it('preço muda na hora, com a data; valor ou unidade fora da lista: 400', async () => {
    const { app, repo, headers } = await produtorPronto();
    const ok = await app.inject({
      method: 'PUT',
      url: `/produtor/catalogo/itens/${ITEM_A}/preco`,
      headers,
      payload: { preco: { centavos: 1050, unidade: 'litro' } },
    });
    expect(ok.statusCode).toBe(204);
    expect(repo.estado.itens[0]).toMatchObject({ precoCentavos: 1050, precoAtualizadoEm: AGORA });

    for (const preco of [
      { centavos: 10.5, unidade: 'litro' },
      { centavos: 0, unidade: 'litro' },
      { centavos: 100, unidade: 'tonelada' },
      { centavos: 100_000_000, unidade: 'kg' },
    ]) {
      const r = await app.inject({
        method: 'PUT',
        url: `/produtor/catalogo/itens/${ITEM_A}/preco`,
        headers,
        payload: { preco },
      });
      expect(r.statusCode, JSON.stringify(preco)).toBe(400);
    }
  });

  it('o catálogo comporta 30 itens (publicados + novos em análise)', async () => {
    const { app, repo, headers } = await produtorPronto();
    for (let i = 2; i <= 30; i++) {
      repo.estado.itens.push(
        item(`40000000-0000-4000-8000-${String(i).padStart(12, '0')}`, 'fazenda', { ordem: i }),
      );
    }
    const r = await app.inject({
      method: 'POST',
      url: '/produtor/catalogo/propostas',
      headers,
      payload: { nome: 'Mais um' },
    });
    expect(r.statusCode).toBe(409);
    expect(r.json().erro).toBe('limite_itens');
  });

  it('remover item e cancelar envio', async () => {
    const { app, repo, headers } = await produtorPronto();
    const { id } = (
      await app.inject({
        method: 'POST',
        url: '/produtor/catalogo/propostas',
        headers,
        payload: { nome: 'Nata' },
      })
    ).json() as { id: string };
    const cancelar = await app.inject({
      method: 'DELETE',
      url: `/produtor/catalogo/propostas/${id}`,
      headers,
    });
    const remover = await app.inject({
      method: 'DELETE',
      url: `/produtor/catalogo/itens/${ITEM_A}`,
      headers,
    });
    expect([cancelar.statusCode, remover.statusCode]).toEqual([204, 204]);
    expect(repo.estado.propostas).toEqual([]);
    expect(repo.estado.itens.map((i) => i.produtorId)).toEqual(['sitio']);
  });
});

describe('fotos dos itens', () => {
  it('a foto enviada fica privada: só o produtor que mandou vê', async () => {
    const { app, repo, headers, conta } = await produtorPronto();
    const envio = await app.inject({
      method: 'POST',
      url: '/produtor/fotos',
      headers,
      payload: { imagem: `data:image/jpeg;base64,${await jpegBase64()}` },
    });
    expect(envio.statusCode).toBe(201);
    const foto = envio.json() as { id: string; largura: number; altura: number };
    expect(foto).toMatchObject({ largura: 800, altura: 800 });
    expect(repo.estado.fotos.get(foto.id)?.publica).toBe(false);

    const dono = await app.inject({ method: 'GET', url: `/produtor/fotos/${foto.id}`, headers });
    expect(dono.statusCode).toBe(200);
    expect(dono.headers['cache-control']).toContain('private');

    // Outro produtor não vê nem consegue usar a foto num item.
    repo.estado.convites.set(hashDoCodigo('SSSS-SSSS'), { produtorId: 'sitio', expiraEm: DEPOIS });
    const outro = await conta('sitio@exemplo.com');
    await app.inject({
      method: 'POST',
      url: '/produtor/vincular',
      headers: outro,
      payload: { codigo: 'SSSS-SSSS' },
    });
    const ver = await app.inject({
      method: 'GET',
      url: `/produtor/fotos/${foto.id}`,
      headers: outro,
    });
    const usar = await app.inject({
      method: 'POST',
      url: '/produtor/catalogo/propostas',
      headers: outro,
      payload: { nome: 'Leite', fotoId: foto.id },
    });
    expect([ver.statusCode, usar.statusCode]).toEqual([404, 400]);
  });

  it('item novo com a foto enviada leva as dimensões', async () => {
    const { app, repo, headers } = await produtorPronto();
    const foto = (
      await app.inject({
        method: 'POST',
        url: '/produtor/fotos',
        headers,
        payload: { imagem: await jpegBase64() },
      })
    ).json() as { id: string };
    await app.inject({
      method: 'POST',
      url: '/produtor/catalogo/propostas',
      headers,
      payload: { nome: 'Ovos', fotoId: foto.id },
    });
    expect(repo.estado.propostas[0]?.foto).toEqual({ id: foto.id, largura: 800, altura: 800 });
  });

  it('o que não é imagem é recusado', async () => {
    const { app, headers } = await produtorPronto();
    const r = await app.inject({
      method: 'POST',
      url: '/produtor/fotos',
      headers,
      payload: { imagem: Buffer.from('não sou uma foto').toString('base64') },
    });
    expect(r.statusCode).toBe(400);
    expect(r.json().erro).toBe('foto_invalida');
  });
});
