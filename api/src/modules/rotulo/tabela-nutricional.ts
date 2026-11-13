import type { LabelLine } from '@nutriscan/shared';

import type { Nutrientes } from '../analise/dados-alimento.js';
import { normalizar } from '../analise/texto.js';

export type TabelaLida = {
  /** Valores por 100 g ou 100 ml, já convertidos se a tabela só trazia a porção. */
  nutrientes: Nutrientes;
  /** "ml" quando a tabela é de bebida (por 100 ml). */
  unidade: 'g' | 'ml';
  /** Como os valores por 100 foram obtidos. */
  origem: 'coluna_100' | 'convertido_da_porcao';
};

type Campo = keyof Omit<Nutrientes, 'frutasLegumesPct' | 'acucares'> | 'acucares';

/**
 * Rótulo de cada linha da tabela (texto normalizado), na ordem em que é testado: "açúcares
 * adicionados" antes de "açúcares totais"; "gorduras saturadas" sem pegar "totais" nem "trans".
 */
const LINHAS: [Campo, RegExp][] = [
  ['energiaKcal', /valor energetico|^energia/],
  ['acucaresAdicionados', /acucares adicionados/],
  ['acucares', /acucares(?: totais)?\b/],
  ['gorduraSaturada', /gorduras? saturadas?/],
  ['sodioMg', /^sodio/],
  ['fibras', /fibras?(?: alimentar(?:es)?)?\b/],
  ['proteinas', /^proteinas?/],
];

/** Mínimo de nutrientes reconhecidos para considerar que a foto é mesmo de uma tabela. */
const MINIMO_NUTRIENTES = 3;

/**
 * Lê a tabela nutricional (modelo da RDC 429/2020 ou o antigo, só por porção) a partir das linhas
 * do OCR. Retorna null se não reconhecer a tabela ou não souber a base (100 g/ml ou porção) —
 * melhor nenhum valor do que um valor errado.
 */
export function lerTabelaNutricional(linhas: readonly LabelLine[]): TabelaLida | null {
  const fileiras = agruparEmFileiras(linhas);
  const textoTodo = normalizar(fileiras.map(textoDaFileira).join(' '));

  // Cabeçalho do modelo novo: "100 g | 30 g | %VD*" — a primeira coluna numérica é a de 100.
  const cem = /\b100\s*(g|ml)\b/.exec(textoTodo);
  const porcao = lerPorcao(textoTodo);
  if (!cem && !porcao) return null;
  const unidade = ((cem?.[1] ?? porcao?.unidade) === 'ml' ? 'ml' : 'g') as 'g' | 'ml';
  const fator = cem ? 1 : 100 / porcao!.quantidade;
  const coluna = cem ? colunaDos100(fileiras) : undefined;

  const nutrientes: Nutrientes = {};
  for (const fileira of fileiras) {
    const norm = normalizar(textoDaFileira(fileira)).trim();
    const campo = LINHAS.find(([, padrao]) => padrao.test(norm))?.[0];
    if (!campo || nutrientes[campo] !== undefined) continue;
    if (campo === 'acucares' && /adicionad/.test(norm)) continue;
    if (campo === 'gorduraSaturada' && /trans|totais/.test(norm)) continue;

    const valor = valorDaFileira(fileira, norm, campo, coluna);
    if (valor === undefined) continue;
    const convertido = campo === 'sodioMg' && /\(g\)/.test(norm) ? valor * 1000 : valor;
    nutrientes[campo] = arredondar(convertido * fator);
  }

  if (Object.keys(nutrientes).length < MINIMO_NUTRIENTES) return null;
  return { nutrientes, unidade, origem: cem ? 'coluna_100' : 'convertido_da_porcao' };
}

/**
 * Agrupa as linhas do OCR em fileiras da tabela. O Vision lê tabelas por coluna (todos os
 * nomes, depois todos os valores) ou devolve a fileira inteira numa linha só ("Sódio (mg) 400
 * 120 6"); a posição vertical é o que junta cada nome aos seus valores. Linhas cujo centro
 * vertical cai dentro da altura de outra são a mesma fileira; dentro dela, da esquerda para a
 * direita.
 */
export function agruparEmFileiras(linhas: readonly LabelLine[]): LabelLine[][] {
  const ordenadas = [...linhas]
    .filter((l) => l.texto.trim())
    .sort((a, b) => a.y + a.altura / 2 - (b.y + b.altura / 2));

  const fileiras: { centro: number; altura: number; linhas: LabelLine[] }[] = [];
  for (const linha of ordenadas) {
    const centro = linha.y + linha.altura / 2;
    const atual = fileiras.at(-1);
    if (atual && Math.abs(centro - atual.centro) < Math.max(atual.altura, linha.altura) * 0.6) {
      atual.linhas.push(linha);
    } else {
      fileiras.push({ centro, altura: linha.altura, linhas: [linha] });
    }
  }
  return fileiras.map((f) => f.linhas.sort((a, b) => a.x - b.x));
}

export const textoDaFileira = (fileira: readonly LabelLine[]) =>
  fileira.map((l) => l.texto.trim()).join(' ');

/** Célula só com um valor: "480", "9,5", "<1", "**", "15 mg". */
const CELULA_VALOR = /^(\*\*|<?\s*\d+(?:[.,]\d+)?)\s*(?:g|mg|kcal|kj)?$/;

type Coluna = { centro: number; tolerancia: number };

/**
 * Posição horizontal da coluna "100 g", quando o cabeçalho veio em células separadas. A
 * tolerância é metade da distância até a coluna vizinha (ex.: a da porção).
 */
function colunaDos100(fileiras: readonly LabelLine[][]): Coluna | undefined {
  for (const fileira of fileiras) {
    const i = fileira.findIndex((l) => /^100\s*(g|ml)$/.test(normalizar(l.texto).trim()));
    if (i === -1) continue;
    const centroDe = (l: LabelLine) => l.x + l.largura / 2;
    const centro = centroDe(fileira[i]!);
    const vizinhas = fileira.filter((_, j) => j !== i).map((l) => Math.abs(centroDe(l) - centro));
    const tolerancia = vizinhas.length > 0 ? Math.min(...vizinhas) / 2 : 0.06;
    return { centro, tolerancia };
  }
  return undefined;
}

/**
 * Valor por 100 g/ml de uma fileira. Com as células separadas e a coluna conhecida, vale só o
 * número que está embaixo de "100 g": se o OCR não leu essa célula, o valor fica faltando em
 * vez de pegar o da porção (que está ao lado). Sem isso, o primeiro número depois do nome.
 */
function valorDaFileira(
  fileira: readonly LabelLine[],
  norm: string,
  campo: Campo,
  coluna: Coluna | undefined,
): number | undefined {
  const celulas = fileira.filter((l) => CELULA_VALOR.test(normalizar(l.texto).trim()));
  if (coluna && celulas.length > 0 && celulas.length < fileira.length) {
    const naColuna = celulas.find(
      (l) => Math.abs(l.x + l.largura / 2 - coluna.centro) <= coluna.tolerancia,
    );
    return naColuna ? primeiroNumero(normalizar(naColuna.texto)) : undefined;
  }
  return campo === 'energiaKcal' ? lerKcal(norm) : primeiroNumero(norm);
}

/** "Porção de 30 g (1 xícara)", "Porção: 200 ml (1 copo)", "porções por embalagem: 13 · porção: 30 g". */
function lerPorcao(texto: string): { quantidade: number; unidade: 'g' | 'ml' } | undefined {
  const m = /porcao(?: de)?\s*:?\s*(\d+(?:[.,]\d+)?)\s*(g|ml)\b/.exec(texto);
  if (!m) return undefined;
  const quantidade = numero(m[1]!);
  return quantidade > 0 ? { quantidade, unidade: m[2] as 'g' | 'ml' } : undefined;
}

/** Energia: o valor em kcal ("Valor energético (kcal) 380 114 6" ou "120 kcal = 504 kJ"). */
function lerKcal(texto: string): number | undefined {
  const comUnidade = /(\d+(?:[.,]\d+)?)\s*kcal/.exec(texto);
  if (comUnidade) return numero(comUnidade[1]!);
  // "(kcal)" no rótulo e os números depois; uma linha só em kJ não serve.
  return /kcal/.test(texto) ? primeiroNumero(texto) : undefined;
}

/**
 * Primeiro número depois do nome do nutriente. Ignora o que está entre parênteses ("(g)", "(mg)")
 * e trata "**" e "0" do mesmo jeito: quantidade não significativa conta como zero.
 */
function primeiroNumero(texto: string): number | undefined {
  const semUnidades = texto.replace(/\([^)]*\)/g, ' ');
  const m = /(?:^|[\s:<])(\*\*|\d+(?:[.,]\d+)?)/.exec(semUnidades);
  if (!m) return undefined;
  return m[1] === '**' ? 0 : numero(m[1]!);
}

/** Vírgula decimal; ponto de milhar ("1.200" mg de sódio). */
const numero = (t: string) =>
  Number(/^\d{1,3}\.\d{3}$/.test(t) ? t.replace('.', '') : t.replace(',', '.'));
const arredondar = (v: number) => Math.round(v * 10) / 10;
