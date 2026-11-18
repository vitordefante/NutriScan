import { readFile } from 'node:fs/promises';

import type { Producer, ProductResult } from '@nutriscan/shared';
import { describe, expect, it } from 'vitest';

import { buildApp } from '../../app.js';
import { depsDeTeste, produtoresEmMemoria } from '../../test/deps.js';
import { categoriaDoProduto } from './categoria-do-produto.js';
import {
  arquivoLocalSchema,
  paraPublicar,
  pedidoSchema,
  produtorLocalSchema,
} from './produtores.schema.js';

async function exemplo() {
  const url = new URL('../../../data/produtores.exemplo.json', import.meta.url);
  return JSON.parse(await readFile(url, 'utf8')) as { produtores: Record<string, unknown>[] };
}

describe('arquivo local de produtores', () => {
  it('o arquivo de exemplo do repositório é válido', async () => {
    expect(arquivoLocalSchema.safeParse(await exemplo()).success).toBe(true);
  });

  it('sem autorização para publicar, o produtor é recusado', async () => {
    const [p] = (await exemplo()).produtores;
    const r = produtorLocalSchema.safeParse({
      ...p,
      autorizacao: { publicar: false, data: '2026-11-18' },
    });
    expect(r.success).toBe(false);
  });

  it('orgânico certificado exige a certificação', async () => {
    const [p] = (await exemplo()).produtores;
    const r = produtorLocalSchema.safeParse({ ...p, cultivo: 'organico_certificado' });
    expect(r.success).toBe(false);
  });

  it('exige ao menos um contato e não aceita ids repetidos', async () => {
    const { produtores } = await exemplo();
    expect(produtorLocalSchema.safeParse({ ...produtores[0], contato: {} }).success).toBe(false);
    expect(
      arquivoLocalSchema.safeParse({ produtores: [produtores[0], produtores[0]] }).success,
    ).toBe(false);
  });

  it('WhatsApp e Instagram são normalizados', async () => {
    const [p] = (await exemplo()).produtores;
    const r = produtorLocalSchema.parse({
      ...p,
      contato: { whatsapp: '+55 (47) 90000-0000', instagram: '@sitio.exemplo' },
    });
    expect(r.contato).toEqual({ whatsapp: '5547900000000', instagram: 'sitio.exemplo' });
  });

  it('para publicar: sai a autorização; local aproximado perde o endereço e é arredondado', async () => {
    const [p] = (await exemplo()).produtores;
    const local = {
      tipo: 'propriedade',
      endereco: 'Estrada da casa do produtor, km 3',
      cidade: 'Joinville',
      latitude: -26.212345,
      longitude: -48.917891,
      precisao: 'aproximada',
    };
    const publicado = paraPublicar(produtorLocalSchema.parse({ ...p, locais: [local] }));

    expect(publicado).not.toHaveProperty('autorizacao');
    expect(publicado.locais).toEqual([
      {
        tipo: 'propriedade',
        cidade: 'Joinville',
        latitude: -26.21,
        longitude: -48.92,
        precisao: 'aproximada',
      },
    ]);
  });

  it('local exato fica como está', async () => {
    const [p] = (await exemplo()).produtores;
    const publicado = paraPublicar(produtorLocalSchema.parse(p));
    expect(publicado.locais[0]).toMatchObject({
      latitude: -26.30451,
      endereco: 'Praça Exemplo, s/n',
    });
  });
});

describe('categoria do produto escaneado', () => {
  const alimento = (...categorias: string[]) => ({ tipo: 'alimento' as const, categorias });

  it.each([
    [['en:farming-products', 'en:eggs', 'en:chicken-eggs'], 'ovos'],
    [['en:spreads', 'en:sweet-spreads', 'en:bee-products', 'en:honeys'], 'mel'],
    [['en:dairies', 'en:fermented-foods', 'en:cheeses'], 'laticinios'],
    [['en:plant-based-foods', 'en:fruits-based-foods', 'en:jams'], 'artesanais'],
    [['en:plant-based-foods', 'en:cereals-and-potatoes', 'en:breads'], 'artesanais'],
    [['en:plant-based-foods', 'en:legumes', 'en:pulses', 'en:beans'], 'graos'],
    [['en:meats', 'en:prepared-meats', 'en:sausages'], 'carnes'],
  ])('%j → %s', (categorias, esperado) => {
    expect(categoriaDoProduto(alimento(...categorias))).toBe(esperado);
  });

  it('sem correspondência (refrigerante, biscoito): null', () => {
    expect(categoriaDoProduto(alimento('en:beverages', 'en:sodas'))).toBeNull();
    expect(categoriaDoProduto(alimento('en:snacks', 'en:biscuits'))).toBeNull();
  });

  it('cosméticos: sabonete vai para cosméticos naturais; xampu não', () => {
    expect(
      categoriaDoProduto({ tipo: 'cosmetico', categorias: ['en:soaps', 'en:bar-soaps'] }),
    ).toBe('cosmeticos');
    expect(categoriaDoProduto({ tipo: 'cosmetico', categorias: ['en:shampoos'] })).toBeNull();
    // Mesma tag, outro tipo: "en:eggs" num cosmético não é ovo.
    expect(categoriaDoProduto({ tipo: 'cosmetico', categorias: ['en:eggs'] })).toBeNull();
  });
});

const produtor = (id: string, nome: string, categorias: Producer['categorias']): Producer => ({
  id,
  nome,
  categorias,
  produtos: ['algo'],
  contato: { whatsapp: '5547900000000' },
  locais: [
    { tipo: 'feira', cidade: 'Joinville', latitude: -26.3, longitude: -48.84, precisao: 'exata' },
  ],
});

const LISTA = [
  produtor('sitio-b', 'Sítio Boa Vista', ['hortalicas', 'ovos']),
  produtor('apiario', 'Apiário Abelha', ['mel']),
];

const pedido = {
  nome: 'Sítio Novo',
  categorias: ['frutas'],
  produtos: 'banana e laranja',
  local: 'Feira do centro, sábado',
  whatsapp: '(47) 90000-0000',
  autorizaPublicar: true,
};

describe('rotas de produtores', () => {
  it('GET /produtores: todos, em ordem de nome', async () => {
    const app = buildApp(depsDeTeste({ produtores: produtoresEmMemoria(LISTA) }));
    const r = await app.inject({ method: 'GET', url: '/produtores' });
    expect(r.json<Producer[]>().map((p) => p.nome)).toEqual(['Apiário Abelha', 'Sítio Boa Vista']);
  });

  it('GET /produtores/:id: o produtor, ou 404', async () => {
    const app = buildApp(depsDeTeste({ produtores: produtoresEmMemoria(LISTA) }));
    const ok = await app.inject({ method: 'GET', url: '/produtores/apiario' });
    const nao = await app.inject({ method: 'GET', url: '/produtores/nao-existe' });
    expect(ok.json<Producer>().nome).toBe('Apiário Abelha');
    expect(nao.statusCode).toBe(404);
    expect(nao.json().erro).toBe('produtor_nao_encontrado');
  });

  it('POST /produtores/pedidos: grava o pedido pendente (sem conta)', async () => {
    const produtores = produtoresEmMemoria();
    const app = buildApp(depsDeTeste({ produtores }));
    const r = await app.inject({ method: 'POST', url: '/produtores/pedidos', payload: pedido });

    expect(r.statusCode).toBe(201);
    expect(produtores.pedidos).toEqual([{ ...pedido, whatsapp: '5547900000000' }]);
  });

  it('pedido sem a autorização ou sem categoria: 400', async () => {
    const app = buildApp(depsDeTeste());
    for (const corpo of [
      { ...pedido, autorizaPublicar: false },
      { ...pedido, categorias: [] },
      { ...pedido, whatsapp: '9999' },
    ]) {
      const r = await app.inject({ method: 'POST', url: '/produtores/pedidos', payload: corpo });
      expect(r.statusCode).toBe(400);
    }
  });

  it('no máximo 5 pedidos por hora do mesmo endereço', async () => {
    const app = buildApp(depsDeTeste());
    const codigos = [];
    for (let i = 0; i < 6; i++) {
      const r = await app.inject({ method: 'POST', url: '/produtores/pedidos', payload: pedido });
      codigos.push(r.statusCode);
    }
    expect(codigos).toEqual([201, 201, 201, 201, 201, 429]);
  });

  it('GET /produtos/:barcode/produtores: quem vende o que substitui o produto', async () => {
    const ovos = {
      produto: {
        barcode: '7891234567895',
        tipo: 'alimento',
        nome: 'Ovos brancos',
        categorias: ['en:eggs'],
      },
    } as ProductResult;
    const app = buildApp(
      depsDeTeste({
        produtores: produtoresEmMemoria(LISTA),
        produtos: {
          consultar: async () => ovos,
          enviarRotulo: async () => ({ ok: false, ilegiveis: [] }),
        },
      }),
    );
    const r = await app.inject({ method: 'GET', url: '/produtos/7891234567895/produtores' });
    expect(r.json()).toMatchObject({ categoria: 'ovos', produtores: [{ id: 'sitio-b' }] });
  });

  it('produto sem categoria de produtor: lista vazia; produto inexistente: 404', async () => {
    const refri = {
      produto: {
        barcode: '7894900010398',
        tipo: 'alimento',
        nome: 'Refri',
        categorias: ['en:sodas'],
      },
    } as ProductResult;
    const deps = (r: ProductResult | null) =>
      depsDeTeste({
        produtores: produtoresEmMemoria(LISTA),
        produtos: {
          consultar: async () => r,
          enviarRotulo: async () => ({ ok: false, ilegiveis: [] }),
        },
      });
    const vazio = await buildApp(deps(refri)).inject({
      method: 'GET',
      url: '/produtos/7894900010398/produtores',
    });
    const nada = await buildApp(deps(null)).inject({
      method: 'GET',
      url: '/produtos/7894900010398/produtores',
    });

    expect(vazio.json()).toEqual({ categoria: null, produtores: [] });
    expect(nada.statusCode).toBe(404);
  });
});

describe('schema do pedido', () => {
  it('normaliza o WhatsApp e o Instagram', () => {
    const r = pedidoSchema.parse({
      ...pedido,
      whatsapp: '+55 47 90000-0000',
      instagram: '@sitio_novo',
    });
    expect(r).toMatchObject({ whatsapp: '5547900000000', instagram: 'sitio_novo' });
  });
});
