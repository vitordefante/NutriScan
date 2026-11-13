import type { Alert, Analysis, AnalysisHighlights, ScoreBand, ScoreItem } from '@nutriscan/shared';

import { detectarAditivos, type GrupoAditivo, type NivelAditivo, temAdocante } from './aditivos.js';
import { type Alimento, prepararAlimento } from './alimento.js';
import type { DadosAlimento, GrupoNova, LetraNutriScore } from './dados-alimento.js';
import { avaliarLupa, type AltoEm, type NutrienteLupa } from './lupa.js';
import { type ClassificacaoNova, classificarNova } from './nova.js';
import { avaliarNutriScore, type ResultadoNutriScore } from './nutri-score.js';

/** Pesos da metodologia v1 (docs/metodologia-nota.md, seção 2). */
export const PESOS = {
  nova: { 1: 0, 2: -5, 3: -15, 4: -45 } satisfies Record<GrupoNova, number>,
  nutriScore: { A: 0, B: -5, C: -12, D: -22, E: -32 } satisfies Record<LetraNutriScore, number>,
  lupaPorItem: -10,
  aditivo: { alto: -8, moderado: -4, baixo: -1 } satisfies Record<NivelAditivo, number>,
  limiteAditivos: -20,
  organico: 5,
} as const;

const FONTES = {
  nova: 'Guia Alimentar para a População Brasileira (Ministério da Saúde, 2014); classificação NOVA (Monteiro et al.)',
  nutriScore: 'Nutri-Score, algoritmo de 2023 (Santé publique France)',
  lupa: 'ANVISA, RDC 429/2020 e IN 75/2020 (Anexo XV)',
  organico: 'Selo de produto orgânico (Lei 10.831/2003)',
  metodologia: 'Metodologia NutriScan (docs/metodologia-nota.md)',
};

const DESCRICAO_NOVA: Record<GrupoNova, string> = {
  1: 'in natura ou minimamente processado',
  2: 'ingrediente culinário',
  3: 'processado',
  4: 'ultraprocessado',
};

const NOME_NUTRIENTE: Record<NutrienteLupa, string> = {
  acucar_adicionado: 'açúcar adicionado',
  gordura_saturada: 'gordura saturada',
  sodio: 'sódio',
};

const SELOS_ORGANICOS =
  /^(en|pt):(organic|organico|eu-organic|usda-organic|produto-organico.*|organic-.*)$/;

/** Analisa um alimento e calcula a nota de 0 a 100 com os itens que a explicam. */
export function analisarAlimento(dados: DadosAlimento): Analysis {
  const alimento = prepararAlimento(dados);
  const aditivos = detectarAditivos(alimento);
  const nova = classificarNova(alimento);
  const nutriScore = avaliarNutriScore(alimento, temAdocante(alimento));
  const lupa = avaliarLupa(alimento, nova);
  const alertas = aditivos.map(alertaDeAditivo);

  const faltando: string[] = [];
  if (!nova) faltando.push('lista de ingredientes');
  if (!nutriScore) faltando.push('tabela nutricional');
  // A lupa só é cobrada como dado faltante quando a tabela existe (senão já faltou acima).
  else for (const n of lupa.faltando) faltando.push(`${NOME_NUTRIENTE[n]} na tabela nutricional`);

  if (!nova && !nutriScore) return { status: 'dados_insuficientes', faltando, alertas };

  const itens: ScoreItem[] = [
    ...(nova ? [itemNova(nova)] : []),
    ...(nutriScore ? [itemNutriScore(nutriScore)] : []),
    ...lupa.altos.map(itemLupa),
    ...itensAditivos(aditivos),
    ...(ehOrganico(alimento) ? [itemOrganico()] : []),
  ];

  const soma = itens.reduce((total, item) => total + item.pontos, 0);
  const nota = Math.max(0, Math.min(100, 100 + soma));
  const faixa = faixaDaNota(nota);
  const destaques = montarDestaques(nova, nutriScore, lupa.altos);

  return faltando.length > 0
    ? { status: 'parcial', nota, faixa, itens, alertas, destaques, faltando }
    : { status: 'completa', nota, faixa, itens, alertas, destaques };
}

const NOME_GRUPO_NOVA: Record<GrupoNova, string> = {
  1: 'In natura',
  2: 'Ingrediente culinário',
  3: 'Processado',
  4: 'Ultraprocessado',
};

/** Os mesmos dados dos itens, em formato estruturado para as seções da tela de resultado. */
function montarDestaques(
  nova: ClassificacaoNova | null,
  nutriScore: ResultadoNutriScore | null,
  altos: AltoEm[],
): AnalysisHighlights {
  return {
    // O motivo já diz quando o grupo foi estimado ("Estimado pela categoria…").
    nova: nova && {
      grupo: nova.grupo,
      nome: NOME_GRUPO_NOVA[nova.grupo],
      motivo: motivoNova(nova),
    },
    nutriScore: nutriScore && { letra: nutriScore.letra },
    lupa: altos.map((alto) => ({
      nutriente: alto.nutriente,
      titulo: `Alto em ${NOME_NUTRIENTE[alto.nutriente]}`,
      detalhe: valorLupa(alto),
      estimado: alto.estimado,
    })),
  };
}

export function faixaDaNota(nota: number): ScoreBand {
  if (nota >= 80) return 'excelente';
  if (nota >= 60) return 'bom';
  if (nota >= 40) return 'regular';
  if (nota >= 20) return 'ruim';
  return 'pessimo';
}

function motivoNova(nova: ClassificacaoNova): string {
  const motivos: Record<ClassificacaoNova['origem'], string> = {
    ingredientes:
      nova.marcadores.length > 0
        ? `Contém marcadores de ultraprocessamento: ${nova.marcadores.join(', ')}.`
        : 'Classificado pela lista de ingredientes.',
    fonte: 'Classificação informada pelo Open Food Facts (sem lista de ingredientes em português).',
    categoria: 'Estimado pela categoria do produto (sem lista de ingredientes).',
    nome: 'Estimado pelo nome do produto (sem lista de ingredientes nem categoria).',
  };
  return motivos[nova.origem];
}

function itemNova(nova: ClassificacaoNova): ScoreItem {
  const estimado = nova.origem === 'categoria' || nova.origem === 'nome';
  return {
    id: 'nova',
    label: `Processamento: NOVA ${nova.grupo} (${DESCRICAO_NOVA[nova.grupo]})`,
    pontos: PESOS.nova[nova.grupo],
    motivo: motivoNova(nova),
    fonte: FONTES.nova,
    ...(estimado && { estimado }),
  };
}

function itemNutriScore(ns: ResultadoNutriScore): ScoreItem {
  return {
    id: 'nutri-score',
    label: `Qualidade nutricional: Nutri-Score ${ns.letra}`,
    pontos: PESOS.nutriScore[ns.letra],
    motivo:
      ns.origem === 'calculado'
        ? 'Calculado a partir da tabela nutricional (energia, açúcares, gordura saturada e sal contra fibras, proteínas e frutas/legumes).'
        : 'Letra informada pelo Open Food Facts.',
    fonte: FONTES.nutriScore,
  };
}

/** Ex.: "33 g por 100 g (limite: 15 g)". */
function valorLupa(alto: AltoEm): string {
  const valor = alto.valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  const limite = alto.limite.toLocaleString('pt-BR');
  return `${valor} ${alto.unidade} por ${alto.porcao} (limite: ${limite} ${alto.unidade})`;
}

function itemLupa(alto: AltoEm): ScoreItem {
  return {
    id: `lupa-${alto.nutriente}`,
    label: `Alto em ${NOME_NUTRIENTE[alto.nutriente]}`,
    pontos: PESOS.lupaPorItem,
    motivo:
      `${valorLupa(alto)}.` +
      (alto.estimado
        ? ' Estimado pelos açúcares totais, pois o rótulo tem açúcar entre os ingredientes.'
        : ''),
    fonte: FONTES.lupa,
    ...(alto.estimado && { estimado: true }),
  };
}

function itensAditivos(grupos: GrupoAditivo[]): ScoreItem[] {
  // Mais graves primeiro, para que o limite corte os menos graves.
  const ordenados = [...grupos].sort((a, b) => PESOS.aditivo[a.nivel] - PESOS.aditivo[b.nivel]);
  const itens: ScoreItem[] = ordenados.map((g) => ({
    id: `aditivo-${g.id}`,
    label: `Aditivo: ${g.nome}`,
    pontos: PESOS.aditivo[g.nivel],
    motivo: g.motivo,
    fonte: g.fonte,
  }));
  const soma = itens.reduce((t, i) => t + i.pontos, 0);
  if (soma < PESOS.limiteAditivos) {
    // Item explícito em vez de corte silencioso: a soma dos itens continua batendo com a nota.
    itens.push({
      id: 'aditivos-limite',
      label: 'Limite de desconto por aditivos',
      pontos: PESOS.limiteAditivos - soma,
      motivo: `Os aditivos descontam no máximo ${-PESOS.limiteAditivos} pontos no total.`,
      fonte: FONTES.metodologia,
    });
  }
  return itens;
}

function ehOrganico(alimento: Alimento): boolean {
  return alimento.selos.some((s) => SELOS_ORGANICOS.test(s));
}

function itemOrganico(): ScoreItem {
  return {
    id: 'organico',
    label: 'Produto orgânico',
    pontos: PESOS.organico,
    motivo: 'Produção sem agrotóxicos sintéticos, certificada por selo.',
    fonte: FONTES.organico,
  };
}

const SEVERIDADE: Record<NivelAditivo, Alert['severidade']> = {
  alto: 'alto',
  moderado: 'moderado',
  baixo: 'baixo',
};

function alertaDeAditivo(g: GrupoAditivo): Alert {
  return {
    id: `aditivo-${g.id}`,
    titulo: g.nome,
    descricao: g.motivo,
    severidade: SEVERIDADE[g.nivel],
    fonte: g.fonte,
    estimado: false,
  };
}
