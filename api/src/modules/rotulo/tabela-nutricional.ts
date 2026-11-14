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
  const uteis = linhas.filter((l) => l.texto.trim());
  const textoTodo = normalizar(uteis.map((l) => l.texto).join(' '));

  // Cabeçalho do modelo novo: "100 g | 30 g | %VD*". Sem a coluna de 100 (ex.: suplementos),
  // os valores são da porção e são convertidos para 100.
  const cem = /\b100\s*(g|ml)\b/.exec(textoTodo);
  const porcao = lerPorcao(textoTodo);
  if (!cem && !porcao) return null;
  const unidade = ((cem?.[1] ?? porcao?.unidade) === 'ml' ? 'ml' : 'g') as 'g' | 'ml';
  const fator = cem ? 1 : 100 / porcao!.quantidade;

  const coluna = colunaDaBase(uteis, cem ? 100 : porcao!.quantidade);
  const lidos = coluna ? lerPelaColuna(uteis, coluna) : lerPorFileiras(uteis);

  const nutrientes: Nutrientes = {};
  for (const { campo, valor, rotulo } of lidos) {
    if (nutrientes[campo] !== undefined) continue;
    const convertido = campo === 'sodioMg' && /\(g\)/.test(rotulo) ? valor * 1000 : valor;
    nutrientes[campo] = arredondar(convertido * fator);
  }

  if (Object.keys(nutrientes).length < MINIMO_NUTRIENTES) return null;
  if (!valoresCoerentes(nutrientes)) return null;
  return { nutrientes, unidade, origem: cem ? 'coluna_100' : 'convertido_da_porcao' };
}

type Lido = { campo: Campo; valor: number; rotulo: string };

/** Qual nutriente esta linha nomeia (texto normalizado), se for um dos que a nota usa. */
function campoDaLinha(norm: string): Campo | undefined {
  const campo = LINHAS.find(([, padrao]) => padrao.test(norm))?.[0];
  if (campo === 'acucares' && /adicionad/.test(norm)) return undefined;
  if (campo === 'gorduraSaturada' && /trans|totais/.test(norm)) return undefined;
  return campo;
}

/** Valor escrito na própria linha do nome ("Sódio (mg) 400 120 6", "120 kcal = 504 kJ"). */
function valorNaLinha(norm: string, campo: Campo): number | undefined {
  return campo === 'energiaKcal' ? lerKcal(norm) : primeiroNumero(norm);
}

const centroX = (l: LabelLine) => l.x + l.largura / 2;
const centroY = (l: LabelLine) => l.y + l.altura / 2;
const mediana = (v: readonly number[]) => {
  const o = [...v].sort((a, b) => a - b);
  return o.length === 0 ? undefined : o[Math.floor(o.length / 2)];
};

/**
 * Leitura pela coluna da base, quando o cabeçalho veio em células separadas — o caso comum: o
 * Vision lê a tabela por coluna (todos os nomes, depois todos os valores), e a posição é o que
 * liga cada nome ao seu valor.
 *
 * Cada nome fica com o valor mais próximo na altura dentro da coluna da base, mas só se a escolha
 * for mútua (o valor também tem aquele nome como o mais próximo). Assim, quando o OCR pula uma
 * célula (o Vision costuma ignorar "0" sozinho), o nome fica sem valor em vez de pegar o do
 * vizinho.
 */
function lerPelaColuna(linhas: readonly LabelLine[], coluna: Coluna): Lido[] {
  const daTabela = linhas.filter((l) => l.x <= coluna.limiteDireito && centroY(l) > coluna.y);
  const valores = daTabela.filter(
    (l) =>
      CELULA_VALOR.test(normalizar(l.texto).trim()) &&
      centroX(l) >= coluna.centro - coluna.tolerancia,
  );
  // Nomes: todo texto à esquerda da coluna (não só os nutrientes da nota — os outros, como
  // carboidratos ou aminoácidos, também "disputam" os valores e evitam pares errados).
  const nomes = daTabela.filter(
    (l) => /\p{L}{3,}/u.test(l.texto) && centroX(l) < coluna.centro - coluna.tolerancia,
  );

  const alturas = nomes.map(centroY).sort((a, b) => a - b);
  const passo =
    mediana(
      alturas
        .slice(1)
        .map((y, i) => y - alturas[i]!)
        .filter((d) => d > 0.004),
    ) ?? 0.03;

  // Acompanha a tabela de cima para baixo: o desvio entre a altura do nome e a do valor muda
  // devagar (foto inclinada, embalagem curva) e cada par seguro atualiza o desvio esperado
  // para a fileira seguinte.
  const maisProximo = <T>(itens: readonly T[], y: number, alturaDe: (i: T) => number) =>
    itens.reduce<T | undefined>(
      (melhor, i) =>
        melhor === undefined || Math.abs(alturaDe(i) - y) < Math.abs(alturaDe(melhor) - y)
          ? i
          : melhor,
      undefined,
    );
  const comValor = new Map<LabelLine, LabelLine>();
  const usados = new Set<LabelLine>();
  // Desvio inicial: mediana do desvio entre os primeiros valores da coluna e o nome mais
  // próximo de cada um (a foto pode já começar inclinada no topo da tabela).
  const primeiros = valores
    .filter((v) => Math.abs(centroX(v) - coluna.centro) <= coluna.tolerancia)
    .sort((a, b) => centroY(a) - centroY(b))
    .slice(0, 4);
  let desvio =
    mediana(
      primeiros.flatMap((v) => {
        const nome = maisProximo(nomes, centroY(v), centroY);
        return nome ? [centroY(v) - centroY(nome)] : [];
      }),
    ) ?? 0;
  let colunaX = coluna.centro; // a coluna também "anda" na foto (perspectiva)
  for (const nome of [...nomes].sort((a, b) => centroY(a) - centroY(b))) {
    const naColuna = valores.filter(
      (v) => !usados.has(v) && Math.abs(centroX(v) - colunaX) <= coluna.tolerancia,
    );
    const esperado = centroY(nome) + desvio;
    const valor = maisProximo(naColuna, esperado, centroY);
    if (!valor || Math.abs(centroY(valor) - esperado) > 0.4 * passo) continue;
    // Mútuo: com o mesmo desvio, nenhum outro nome fica mais perto deste valor.
    if (maisProximo(nomes, centroY(valor), (n) => centroY(n) + desvio) !== nome) continue;
    comValor.set(nome, valor);
    usados.add(valor);
    desvio = (desvio + centroY(valor) - centroY(nome)) / 2;
    colunaX = (colunaX + centroX(valor)) / 2;
  }

  const lidos: Lido[] = [];
  for (const nome of nomes) {
    const rotulo = normalizar(nome.texto).trim();
    const campo = campoDaLinha(rotulo);
    if (!campo) continue;
    const celula = comValor.get(nome);
    const valor = celula ? primeiroNumero(normalizar(celula.texto)) : valorNaLinha(rotulo, campo);
    if (valor !== undefined) lidos.push({ campo, valor, rotulo });
  }
  return lidos;
}

/**
 * Leitura por fileiras, quando não há cabeçalho em células (modelo antigo, ou cada fileira lida
 * numa linha só): o valor é o primeiro número depois do nome.
 */
function lerPorFileiras(linhas: readonly LabelLine[]): Lido[] {
  return agruparEmFileiras(linhas).flatMap((fileira) => {
    const rotulo = normalizar(textoDaFileira(fileira)).trim();
    const campo = campoDaLinha(rotulo);
    const valor = campo && valorNaLinha(rotulo, campo);
    return campo && valor !== undefined ? [{ campo, valor, rotulo }] : [];
  });
}

/**
 * Os valores lidos fecham entre si? Pega leituras com colunas trocadas (ex.: valores da porção
 * tomados como base, ou o "100" do cabeçalho tomado como energia):
 * - em 100 g, proteínas + açúcares + gordura saturada + fibras não passam de 100 g;
 * - essas quantidades já somam calorias (4 kcal/g para proteína e açúcar, 9 para gordura) que
 *   não podem passar da energia declarada (com folga para arredondamentos do rótulo).
 */
export function valoresCoerentes(n: Nutrientes): boolean {
  const g = (v: number | undefined) => v ?? 0;
  const acucar = n.acucares ?? n.acucaresAdicionados;
  const massa = g(n.proteinas) + g(acucar) + g(n.gorduraSaturada) + g(n.fibras);
  if (massa > 105) return false;
  if (n.sodioMg !== undefined && n.sodioMg > 40_000) return false;
  if (n.energiaKcal === undefined) return true;
  if (n.energiaKcal > 950) return false;
  const kcalMinima = 4 * g(n.proteinas) + 4 * g(acucar) + 9 * g(n.gorduraSaturada);
  return kcalMinima <= n.energiaKcal * 1.15 + 15;
}

/**
 * Agrupa as linhas do OCR em fileiras (para o modelo antigo e para fileiras lidas numa linha
 * só). Uma linha entra na fileira se o centro dela estiver perto do centro médio da fileira —
 * "perto" medido pela menor altura (a caixa de um texto longo e inclinado é mais alta que o
 * texto); dentro da fileira, da esquerda para a direita.
 */
export function agruparEmFileiras(linhas: readonly LabelLine[]): LabelLine[][] {
  const ordenadas = [...linhas]
    .filter((l) => l.texto.trim())
    .sort((a, b) => centroY(a) - centroY(b));

  const fileiras: { soma: number; menorAltura: number; linhas: LabelLine[] }[] = [];
  for (const linha of ordenadas) {
    const atual = fileiras.at(-1);
    const centro = centroY(linha);
    const tolerancia = 0.55 * Math.min(atual?.menorAltura ?? Infinity, linha.altura);
    if (atual && Math.abs(centro - atual.soma / atual.linhas.length) < tolerancia) {
      atual.linhas.push(linha);
      atual.soma += centro;
      atual.menorAltura = Math.min(atual.menorAltura, linha.altura);
    } else {
      fileiras.push({ soma: centro, menorAltura: linha.altura, linhas: [linha] });
    }
  }
  return fileiras.map((f) => f.linhas.sort((a, b) => a.x - b.x));
}

export const textoDaFileira = (fileira: readonly LabelLine[]) =>
  fileira.map((l) => l.texto.trim()).join(' ');

/** Célula só com um valor: "480", "9,5", "<1", "**", "15 mg". */
const CELULA_VALOR = /^(\*\*|<?\s*\d+(?:[.,]\d+)?)\s*(?:g|mg|kcal|kj)?$/;

type Coluna = {
  centro: number;
  /** Altura (centro) do cabeçalho: os valores ficam abaixo dele. */
  y: number;
  /** Metade da distância até a coluna vizinha do cabeçalho (ex.: a da porção ou a do %VD). */
  tolerancia: number;
  /** Fim da última coluna do cabeçalho: o que começa depois disso é outro painel da embalagem. */
  limiteDireito: number;
};

/** Célula de cabeçalho: "100 g", "30 g", "200 ml", "%VD*". */
const CABECALHO = /^(?:\d+(?:[.,]\d+)?\s*(?:g|ml)|%\s*vd.*)$/;

/**
 * Posição da coluna da base ("100 g", ou a da porção quando não há a de 100), quando o
 * cabeçalho veio em células separadas.
 */
function colunaDaBase(linhas: readonly LabelLine[], base: number): Coluna | undefined {
  const cabecalhos = linhas.filter((l) => CABECALHO.test(normalizar(l.texto).trim()));
  const daBase = cabecalhos.find((l) => {
    const m = /^(\d+(?:[.,]\d+)?)\s*(?:g|ml)$/.exec(normalizar(l.texto).trim());
    return m && numero(m[1]!) === base;
  });
  if (!daBase) return undefined;

  // Os outros cabeçalhos da mesma fileira (inclinação pequena: até 1,5 altura de distância).
  const fileira = cabecalhos.filter(
    (l) => Math.abs(centroY(l) - centroY(daBase)) < 1.5 * Math.max(l.altura, daBase.altura),
  );
  const centro = centroX(daBase);
  const vizinhas = fileira.filter((l) => l !== daBase).map((l) => Math.abs(centroX(l) - centro));
  return {
    centro,
    y: centroY(daBase),
    tolerancia: vizinhas.length > 0 ? Math.min(...vizinhas) / 2 : 0.06,
    limiteDireito: Math.max(...fileira.map((l) => l.x + l.largura)) + 0.05,
  };
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
