import type { Alternative, ProductResult } from '@nutriscan/shared';

import { normalizar } from '../analise/texto.js';
import { nomeDaCategoria } from './categorias.js';

/** Quantas alternativas a lista mostra. */
export const LIMITE_ALTERNATIVAS = 5;

/**
 * Diferença mínima de nota para chamar um produto de "melhor": 1 ou 2 pontos estão dentro do
 * que muda com um arredondamento da tabela nutricional.
 */
export const MARGEM = 5;

/** O produto escaneado: a nota de referência e o que identifica cópias dele na base. */
export type Referencia = {
  barcode: string;
  nome: string;
  marca?: string;
  /** Categorias do produto: os nomes delas não distinguem um produto de outro. */
  categorias: readonly string[];
  /** null quando o produto não tem nota (faltam dados): a lista traz os mais bem avaliados. */
  nota: number | null;
};

export type Escolha = {
  /** Quantos produtos distintos tinham dados para a nota completa. */
  comparados: number;
  alternativas: Alternative[];
};

/**
 * Escolhe as alternativas entre os produtos da categoria, já analisados pelo mesmo motor da nota.
 *
 * - Só entram análises COMPLETAS: uma nota parcial é um teto (com os dados que faltam ela só
 *   poderia cair), então não dá para garantir que o produto é melhor.
 * - O mesmo produto cadastrado com outro código (outro tamanho, cadastro repetido) não conta
 *   como alternativa a si mesmo nem aparece duas vezes (ver `mesmoProduto`).
 * - Melhor = pelo menos `MARGEM` pontos acima. A ordem é pela nota; no empate, vale a ordem da
 *   base (os mais escaneados primeiro — os mais fáceis de achar no mercado).
 */
export function escolherAlternativas(
  referencia: Referencia,
  candidatos: readonly ProductResult[],
): Escolha {
  const genericas = new Set(
    referencia.categorias.flatMap((c) => palavrasDe(nomeDaCategoria(c) ?? '')),
  );
  const daReferencia = identidade(referencia.nome, referencia.marca, genericas);
  const vistos: Identidade[] = [];
  const unicos: Alternative[] = [];

  // Da maior nota para a menor (`sort` é estável: no empate, fica a ordem da base). Entre
  // cadastros repetidos de um produto, fica o primeiro — o de nota maior.
  const completos = candidatos
    .flatMap(({ produto, analise }) =>
      analise.status === 'completa' ? [{ produto, analise }] : [],
    )
    .sort((a, b) => b.analise.nota - a.analise.nota);

  for (const { produto, analise } of completos) {
    if (produto.barcode === referencia.barcode || produto.nome === 'Produto sem nome') continue;
    const id = identidade(produto.nome, produto.marca, genericas);
    if (mesmoProduto(id, daReferencia) || vistos.some((v) => mesmoProduto(id, v))) continue;
    vistos.push(id);

    unicos.push({
      barcode: produto.barcode,
      tipo: produto.tipo,
      nome: produto.nome,
      ...(produto.marca && { marca: produto.marca }),
      ...(produto.imagemUrl && { imagemUrl: produto.imagemUrl }),
      nota: analise.nota,
      faixa: analise.faixa,
      nova: analise.destaques.nova?.grupo ?? null,
      nutriScore: analise.destaques.nutriScore?.letra ?? null,
      lupa: analise.destaques.lupa.length,
      alertas: analise.alertas.length,
    });
  }

  const minimo = referencia.nota === null ? -Infinity : referencia.nota + MARGEM;
  const alternativas = unicos.filter((a) => a.nota >= minimo).slice(0, LIMITE_ALTERNATIVAS);

  return { comparados: unicos.length, alternativas };
}

const palavrasDe = (texto: string) =>
  normalizar(texto)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

/** Tamanho e embalagem não mudam o produto ("550g", "refil", "pote", "squeeze"…). */
const EMBALAGEM =
  /^(?:\d+(?:g|kg|ml|l|un)?|g|kg|ml|l|un|unidades?|pacote|pote|caixa|lata|refil|sache|squeeze|sqz|frasco|tubo|embalagem)$/;

/** Palavras que não identificam um produto: só dizem o que ele é. */
const COMUNS = new Set(
  'de da do das dos em e com o a para tipo sabor original tradicional classico classica'.split(' '),
);

/** Uma versão "light", "zero"… é outro produto, mesmo com o resto do nome igual. */
const VARIANTES = new Set(['light', 'zero', 'diet', 'integral', 'organico', 'vegano', 'vegana']);

type Identidade = {
  marca: string;
  /** Palavras do nome sem a marca, o tamanho e a embalagem. */
  nome: Set<string>;
  /** Só as palavras que distinguem o produto (ex.: "nescau"; numa "Maionese", nenhuma). */
  proprias: Set<string>;
};

/** `genericas`: palavras do nome da categoria (ex.: "achocolatado", "cacau", "po"). */
function identidade(nome: string, marca: string | undefined, genericas: Set<string>): Identidade {
  const daMarca = palavrasDe(marca ?? '');
  const marcaJunta = daMarca.join('');
  // Tira do nome a marca, mesmo escrita de outro jeito ("HELLMANNS" com a marca "Hellmann's").
  const doNome = palavrasDe(nome).filter(
    (p) => !daMarca.includes(p) && !parecidas(p, marcaJunta) && !EMBALAGEM.test(p),
  );
  return {
    marca: marcaJunta,
    nome: new Set(doNome),
    proprias: new Set(doNome.filter((p) => !COMUNS.has(p) && !genericas.has(p))),
  };
}

/**
 * Iguais, ou (com 7 letras ou mais) diferentes em uma letra só: o cadastro colaborativo escreve
 * a mesma marca de vários jeitos ("Hellmann's", "Hellmans", "HELLMANNS").
 */
function parecidas(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.min(a.length, b.length) < 7 || Math.abs(a.length - b.length) > 1) return false;
  // Distância de edição ≤ 1: anda pelas duas até a primeira diferença e compara o resto.
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1);
  const [curta, longa] = a.length < b.length ? [a, b] : [b, a];
  return curta.slice(i) === longa.slice(i + 1);
}

const contido = (a: Set<string>, b: Set<string>) => [...a].every((p) => b.has(p));

/**
 * O mesmo produto em outro cadastro (outro tamanho, outra grafia):
 * - nome igual, sem contar marca, tamanho e embalagem: "Maionese Hellmann's 500 g" = "Maionese"
 *   (ambas Hellmann's);
 * - ou, da mesma marca, um nome tem todas as palavras próprias do outro: "Nescau" =
 *   "Achocolatado em pó Nescau Refil"; ou nenhum tem palavra própria ("Toddy" = "Toddy
 *   Original") — menos quando só um deles é "light", "zero"…
 */
function mesmoProduto(a: Identidade, b: Identidade): boolean {
  if (!parecidas(a.marca, b.marca)) return false;
  if (a.nome.size === b.nome.size && contido(a.nome, b.nome)) return true;
  if (!a.marca) return false;
  const variante = (i: Identidade) =>
    [...i.nome]
      .filter((p) => VARIANTES.has(p))
      .sort()
      .join();
  if (variante(a) !== variante(b)) return false;
  // Nenhum dos dois tem palavra própria: é o produto básico da marca ("Toddy", "Toddy Original").
  if (a.proprias.size === 0 && b.proprias.size === 0) return true;
  return (
    (a.proprias.size > 0 && contido(a.proprias, b.nome)) ||
    (b.proprias.size > 0 && contido(b.proprias, a.nome))
  );
}
