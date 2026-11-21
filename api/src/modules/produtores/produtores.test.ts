import { readFile } from 'node:fs/promises';

import type { Producer, ProductResult } from '@nutriscan/shared';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import { buildApp } from '../../app.js';
import { depsDeTeste, produtoresEmMemoria } from '../../test/deps.js';
import { categoriaDoProduto } from './categoria-do-produto.js';
import { LADO_MAXIMO, prepararFoto } from './fotos.js';
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

  it('fotos exigem a autorização do produtor para as fotos', async () => {
    const [p] = (await exemplo()).produtores;
    const fotos = [{ arquivo: 'sitio/banca.jpg', legenda: 'Banca' }];
    const sem = produtorLocalSchema.safeParse({ ...p, fotos });
    const com = produtorLocalSchema.safeParse({
      ...p,
      fotos,
      autorizacao: { publicar: true, fotos: true, data: '2026-11-19' },
    });
    expect(sem.success).toBe(false);
    expect(com.success).toBe(true);
  });

  it('caminho da foto não sai de api/data/fotos/', async () => {
    const [p] = (await exemplo()).produtores;
    const autorizacao = { publicar: true, fotos: true, data: '2026-11-19' };
    for (const arquivo of ['../.env', 'sitio/../../.env', '/etc/passwd']) {
      const r = produtorLocalSchema.safeParse({ ...p, fotos: [{ arquivo }], autorizacao });
      expect(r.success, arquivo).toBe(false);
    }
    const ok = produtorLocalSchema.safeParse({
      ...p,
      fotos: [{ arquivo: 'sitio/WhatsApp Image 2026-11-18 at 10.30.12.jpeg' }],
      autorizacao,
    });
    expect(ok.success).toBe(true);
  });

  it('para publicar: os nomes dos arquivos saem; entram as fotos preparadas, na ordem', async () => {
    const [p] = (await exemplo()).produtores;
    const local = produtorLocalSchema.parse({
      ...p,
      fotos: [{ arquivo: 'sitio/banca.jpg', legenda: 'Banca' }],
      autorizacao: { publicar: true, fotos: true, data: '2026-11-19' },
    });
    const foto = { id: 'a'.repeat(32), largura: 1600, altura: 1200 };
    const preparadas = new Map([['sitio/banca.jpg', foto]]);
    expect(paraPublicar(local, preparadas).fotos).toEqual([{ ...foto, legenda: 'Banca' }]);
    expect(JSON.stringify(paraPublicar(local, preparadas))).not.toContain('sitio/banca.jpg');
    expect(paraPublicar(local)).not.toHaveProperty('fotos');
  });
});

describe('catálogo do produtor', () => {
  const autorizacao = { publicar: true, fotos: true, data: '2026-11-19' };
  const catalogo = [
    { nome: 'Leite orgânico', descricao: 'Garrafa de 1 L', preco: 'R$ 9', foto: 'faz/leite.jpg' },
    { nome: 'Kefir' },
  ];

  it('substitui a lista de produtos; sem nenhum dos dois, é recusado', async () => {
    const [p] = (await exemplo()).produtores;
    const { produtos: _, ...semProdutos } = p!;
    expect(produtorLocalSchema.safeParse(semProdutos).success).toBe(false);
    const r = produtorLocalSchema.safeParse({ ...semProdutos, catalogo, autorizacao });
    expect(r.success).toBe(true);
  });

  it('foto de item também exige a autorização das fotos', async () => {
    const [p] = (await exemplo()).produtores;
    expect(produtorLocalSchema.safeParse({ ...p, catalogo }).success).toBe(false);
    const fora = [{ nome: 'Leite', foto: '../.env' }];
    expect(produtorLocalSchema.safeParse({ ...p, catalogo: fora, autorizacao }).success).toBe(
      false,
    );
  });

  it('para publicar: a foto preparada entra no item e os nomes completam os produtos', async () => {
    const [p] = (await exemplo()).produtores;
    const local = produtorLocalSchema.parse({
      ...p,
      produtos: ['queijo colonial', 'kefir'],
      catalogo,
      autorizacao,
    });
    const foto = { id: 'b'.repeat(32), largura: 800, altura: 800 };
    const publicado = paraPublicar(local, new Map([['faz/leite.jpg', foto]]));

    expect(publicado.catalogo).toEqual([
      { nome: 'Leite orgânico', descricao: 'Garrafa de 1 L', preco: 'R$ 9', foto },
      { nome: 'Kefir' },
    ]);
    // "Kefir" já estava na lista (sem diferenciar maiúsculas): não repete.
    expect(publicado.produtos).toEqual(['queijo colonial', 'kefir', 'Leite orgânico']);
    expect(JSON.stringify(publicado)).not.toContain('faz/leite.jpg');
  });
});

/** JPEG de teste com EXIF de celular: GPS, modelo do aparelho e orientação (girada 90°). */
async function fotoDeCelular(largura: number, altura: number) {
  return sharp({ create: { width: largura, height: altura, channels: 3, background: '#4a8' } })
    .jpeg()
    .withExif({
      IFD0: { Make: 'Apple', Model: 'iPhone 13 mini' },
      IFD3: { GPSLatitudeRef: 'S', GPSLatitude: '26/1 18/1 0/1' },
    })
    .withMetadata({ orientation: 6 })
    .toBuffer();
}

describe('preparar foto', () => {
  it('apaga os metadados (posição GPS, aparelho)', async () => {
    const original = await fotoDeCelular(400, 300);
    expect((await sharp(original).metadata()).exif).toBeDefined();
    const { bytes } = await prepararFoto(original);
    const meta = await sharp(bytes).metadata();
    expect(meta.exif).toBeUndefined();
    expect(meta.format).toBe('jpeg');
    expect(bytes.includes('iPhone')).toBe(false);
  });

  it('gira conforme a orientação e reduz para o lado máximo, sem ampliar foto pequena', async () => {
    const grande = await prepararFoto(await fotoDeCelular(4000, 3000));
    // Orientação 6 = girada 90°: a foto em pé tem a altura maior.
    expect([grande.largura, grande.altura]).toEqual([LADO_MAXIMO * 0.75, LADO_MAXIMO]);
    const pequena = await prepararFoto(await fotoDeCelular(400, 300));
    expect([pequena.largura, pequena.altura]).toEqual([300, 400]);
  });

  it('o id é o hash do conteúdo: a mesma foto tem o mesmo id', async () => {
    const original = await fotoDeCelular(400, 300);
    const a = await prepararFoto(original);
    const b = await prepararFoto(original);
    expect(a.id).toMatch(/^[0-9a-f]{32}$/);
    expect(a.id).toBe(b.id);
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

  it('GET /produtores/fotos/:id: o JPEG com cache longo, ou 404', async () => {
    const id = 'b'.repeat(32);
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
    const app = buildApp(
      depsDeTeste({ produtores: produtoresEmMemoria(LISTA, new Map([[id, jpeg]])) }),
    );
    const ok = await app.inject({ method: 'GET', url: `/produtores/fotos/${id}` });
    expect(ok.statusCode).toBe(200);
    expect(ok.headers['content-type']).toBe('image/jpeg');
    expect(ok.headers['cache-control']).toContain('immutable');
    expect(ok.rawPayload.equals(jpeg)).toBe(true);
    for (const url of [`/produtores/fotos/${'c'.repeat(32)}`, '/produtores/fotos/..%2F.env']) {
      const nao = await app.inject({ method: 'GET', url });
      expect(nao.statusCode, url).toBe(404);
      expect(nao.json().erro).toBe('foto_nao_encontrada');
    }
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

  it('pedido recusado diz quais campos conferir', async () => {
    const app = buildApp(depsDeTeste());
    const r = await app.inject({
      method: 'POST',
      url: '/produtores/pedidos',
      payload: { ...pedido, instagram: 'instagram.com/sitio' },
    });
    expect(r.statusCode).toBe(400);
    expect(r.json().mensagem).toBe(
      'Confira o Instagram (só o nome do perfil, ex.: @sitioboavista).',
    );
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

  it.each([
    ['(47) 99999-9999', '5547999999999'],
    ['47 9999-9999', '554799999999'],
    ['047 99999-9999', '5547999999999'],
    ['0 15 47 99999-9999', '5547999999999'],
    ['0055 47 99999-9999', '5547999999999'],
    ['+44 20 7946 0958', '442079460958'],
  ])('WhatsApp %s vira %s', (entrada, esperado) => {
    expect(pedidoSchema.parse({ ...pedido, whatsapp: entrada }).whatsapp).toBe(esperado);
  });

  it('recusa WhatsApp que não forma um número válido', () => {
    for (const whatsapp of ['9999-9999', '55 47 99999-99999', '0 47 999']) {
      expect(pedidoSchema.safeParse({ ...pedido, whatsapp }).success, whatsapp).toBe(false);
    }
  });
});
