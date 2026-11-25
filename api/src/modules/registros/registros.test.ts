import type { AuthResult, ExposureSummary, LogEntry, LogPeriod } from '@nutriscan/shared';
import { describe, expect, it } from 'vitest';

import { buildApp } from '../../app.js';
import { depsDeTeste, registrosEmMemoria } from '../../test/deps.js';
import { montarResultado } from '../produtos/montar.js';
import { FonteIndisponivelError } from '../produtos/open-food-facts.client.js';
import type { ProdutoOff } from '../produtos/open-food-facts.mapper.js';
import type { ServicoProdutos } from '../produtos/produtos.service.js';
import { criarServicoRegistros } from './registros.service.js';
import { resumir } from './resumo.js';

const COLA: ProdutoOff = {
  code: '7894900010398',
  product_name: 'Refrigerante de Cola',
  brands: 'Marca',
  quantity: '350 ml',
  ingredients_text_pt:
    'Água gaseificada, açúcar, extrato de noz de cola, cafeína, corante caramelo IV, acidulante ácido fosfórico',
  nutriments: {
    'energy-kcal_100g': 44,
    sugars_100g: 11,
    'saturated-fat_100g': 0,
    sodium_100g: 0.005,
  },
};

const resultadoCola = montarResultado({ fonte: 'open_food_facts', dados: COLA }, false)!;

/** Alimento com tabela completa e porção (30 g), para os registros com nutrição. */
const AVEIA: ProdutoOff = {
  code: '7891000000011',
  product_name: 'Aveia em flocos',
  categories_tags: ['en:oat-flakes'],
  ingredients_text_pt: 'Aveia em flocos',
  serving_quantity: 30,
  nutriments: {
    'energy-kcal_100g': 380,
    carbohydrates_100g: 60,
    sugars_100g: 1,
    proteins_100g: 14,
    fat_100g: 8,
    'saturated-fat_100g': 1.5,
    fiber_100g: 10,
    sodium_100g: 0.005,
    iron_100g: 0.0044,
  },
};
const resultadoAveia = montarResultado({ fonte: 'open_food_facts', dados: AVEIA }, false)!;

function montar(consultar: ServicoProdutos['consultar'] = async () => resultadoCola) {
  const produtos: ServicoProdutos = {
    consultar,
    enviarRotulo: async () => ({ ok: false, ilegiveis: [] }),
  };
  return buildApp(
    depsDeTeste({
      produtos,
      registros: criarServicoRegistros({ produtos, registros: registrosEmMemoria() }),
    }),
  );
}

async function entrar(app: ReturnType<typeof buildApp>, email = 'ana@exemplo.com') {
  const r = await app.inject({
    method: 'POST',
    url: '/contas',
    payload: { email, senha: 'senha-forte-123' },
  });
  return { authorization: `Bearer ${r.json<AuthResult>().token}` };
}

describe('log de exposição (registros)', () => {
  it('exige conta', async () => {
    const r = await montar().inject({
      method: 'POST',
      url: '/registros',
      payload: { barcode: COLA.code },
    });
    expect(r.statusCode).toBe(401);
  });

  it('registra o consumo com a análise do servidor (nota, NOVA, "alto em", alertas)', async () => {
    const app = montar();
    const auth = await entrar(app);

    const r = await app.inject({
      method: 'POST',
      url: '/registros',
      headers: auth,
      payload: { barcode: COLA.code },
    });

    expect(r.statusCode).toBe(201);
    const analise = resultadoCola.analise;
    if (analise.status === 'dados_insuficientes') throw new Error('a cola tem nota');
    expect(r.json<LogEntry>()).toMatchObject({
      barcode: COLA.code,
      tipo: 'alimento',
      nome: 'Refrigerante de Cola',
      nota: analise.nota,
      nova: 4,
      altoEm: ['acucar_adicionado'],
      alertas: analise.alertas.map((a) => a.titulo),
    });
  });

  it('alimento com tabela: guarda quanto foi consumido (padrão: uma porção) e o que deu', async () => {
    const app = montar(async () => resultadoAveia);
    const auth = await entrar(app);
    const registrar = (payload: object) =>
      app.inject({ method: 'POST', url: '/registros', headers: auth, payload });

    const porcao = (await registrar({ barcode: AVEIA.code })).json<LogEntry>();
    expect(porcao.nutricao).toMatchObject({
      quantidade: 30,
      unidade: 'g',
      porcao: 30,
      macros: { energiaKcal: 114, carboidratos: 18, proteinas: 4.2, gorduras: 2.4 },
      micros: { ferro: 1.3 },
    });

    const tigela = (await registrar({ barcode: AVEIA.code, quantidade: 60 })).json<LogEntry>();
    expect(tigela.nutricao).toMatchObject({ quantidade: 60, macros: { carboidratos: 36 } });

    // Média do dia: 30 g + 60 g de aveia.
    const periodo = await app.inject({ method: 'GET', url: '/registros', headers: auth });
    expect(periodo.json<LogPeriod>().resumo.nutricao).toMatchObject({
      registros: 2,
      diasComRegistro: 1,
      porDia: { carboidratos: 54 },
    });

    for (const quantidade of [0, -5, 6000, '30']) {
      const r = await registrar({ barcode: AVEIA.code, quantidade });
      expect(r.statusCode).toBe(400);
      expect(r.json()).toMatchObject({ erro: 'dados_invalidos' });
    }
  });

  it('produto sem tabela (cola sem macros): registra sem nutrição', async () => {
    const app = montar();
    const r = await app.inject({
      method: 'POST',
      url: '/registros',
      headers: await entrar(app),
      payload: { barcode: COLA.code, quantidade: 350 },
    });
    expect(r.statusCode).toBe(201);
    expect(r.json<LogEntry>()).not.toHaveProperty('nutricao');
  });

  it('produto que não existe: 404; base fora do ar: 503; código inválido: 400', async () => {
    const naoExiste = montar(async () => null);
    const foraDoAr = montar(async () => {
      throw new FonteIndisponivelError('teste');
    });
    const registrar = async (app: ReturnType<typeof buildApp>, barcode: string) =>
      app.inject({
        method: 'POST',
        url: '/registros',
        headers: await entrar(app),
        payload: { barcode },
      });

    expect((await registrar(naoExiste, COLA.code)).statusCode).toBe(404);
    expect((await registrar(foraDoAr, COLA.code)).statusCode).toBe(503);
    expect((await registrar(montar(), 'abc')).statusCode).toBe(400);
  });

  it('lista, resume e apaga os registros da própria conta', async () => {
    const app = montar();
    const auth = await entrar(app);
    const outra = await entrar(app, 'bia@exemplo.com');
    const registrar = () =>
      app.inject({
        method: 'POST',
        url: '/registros',
        headers: auth,
        payload: { barcode: COLA.code },
      });
    const { id } = (await registrar()).json<LogEntry>();
    await registrar();

    const periodo = await app.inject({ method: 'GET', url: '/registros?dias=7', headers: auth });
    expect(periodo.json<LogPeriod>()).toMatchObject({
      resumo: { dias: 7, registros: 2, ultraprocessados: 2 },
    });
    expect(periodo.json<LogPeriod>().registros).toHaveLength(2);

    // Outra conta não vê nem apaga.
    const daOutra = await app.inject({ method: 'GET', url: '/registros', headers: outra });
    expect(daOutra.json<LogPeriod>().registros).toEqual([]);
    const apagarAlheio = await app.inject({
      method: 'DELETE',
      url: `/registros/${id}`,
      headers: outra,
    });
    expect(apagarAlheio.statusCode).toBe(404);

    const apagar = await app.inject({ method: 'DELETE', url: `/registros/${id}`, headers: auth });
    expect(apagar.statusCode).toBe(204);
    const depois = await app.inject({ method: 'GET', url: '/registros', headers: auth });
    expect(depois.json<LogPeriod>().registros).toHaveLength(1);
  });

  it('id que não é UUID (mesmo com 36 caracteres): 404, sem chegar ao banco', async () => {
    const app = montar();
    const r = await app.inject({
      method: 'DELETE',
      url: `/registros/${'-'.repeat(36)}`,
      headers: await entrar(app),
    });
    expect(r.statusCode).toBe(404);
  });

  it('período inválido: 400', async () => {
    const app = montar();
    const r = await app.inject({
      method: 'GET',
      url: '/registros?dias=0',
      headers: await entrar(app),
    });
    expect(r.statusCode).toBe(400);
  });
});

const registro = (r: Partial<LogEntry>): LogEntry => ({
  id: '1',
  barcode: '1',
  tipo: 'alimento',
  nome: 'P',
  nota: 50,
  faixa: 'regular',
  nova: 1,
  altoEm: [],
  alertas: [],
  registradoEm: '2026-11-14T10:00:00Z',
  ...r,
});

describe('resumir', () => {
  it('resume o período: nota média, ultraprocessados, "alto em" e alertas mais frequentes', () => {
    const resumo = resumir(
      [
        registro({ nota: 5, nova: 4, altoEm: ['acucar_adicionado'], alertas: ['Fosfatos'] }),
        registro({
          nota: 28,
          nova: 4,
          altoEm: ['sodio', 'acucar_adicionado'],
          alertas: ['Fosfatos', 'Sorbatos'],
        }),
        registro({ nota: 90, nova: 1 }),
        registro({ nota: null, nova: null }),
        registro({ tipo: 'cosmetico', nota: 60, nova: null, alertas: ['Parabenos'] }),
      ],
      7,
    );

    expect(resumo).toEqual({
      dias: 7,
      registros: 5,
      alimentos: 4,
      cosmeticos: 1,
      // Alimentos e cosméticos em médias separadas (réguas diferentes).
      mediaAlimentos: { nota: 41, faixa: 'regular' }, // (5 + 28 + 90) / 3
      mediaCosmeticos: { nota: 60, faixa: 'bom' },
      comNova: 3,
      ultraprocessados: 2,
      altoEm: [
        { nutriente: 'acucar_adicionado', vezes: 2 },
        { nutriente: 'sodio', vezes: 1 },
      ],
      aditivos: [
        { titulo: 'Fosfatos', vezes: 2 },
        { titulo: 'Sorbatos', vezes: 1 },
      ],
      ingredientesAtencao: [{ titulo: 'Parabenos', vezes: 1 }],
      nutricao: null, // nenhum registro com tabela (média diária em nutricao/consumo.test.ts)
    } satisfies ExposureSummary);
  });

  it('período vazio', () => {
    expect(resumir([], 30)).toMatchObject({
      registros: 0,
      mediaAlimentos: null,
      mediaCosmeticos: null,
      ultraprocessados: 0,
    });
  });
});
