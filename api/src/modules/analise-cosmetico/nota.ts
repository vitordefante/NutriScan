import type { Alert, Analysis, ScoreItem } from '@nutriscan/shared';

import { faixaDaNota } from '../analise/nota.js';
import { GRUPOS_COSMETICOS, type GrupoCosmetico, type NivelCosmetico } from './grupos.js';
import { lerIngredientes, listaPareceIncompleta } from './ingredientes.js';

/** Entrada do motor de cosméticos (o mapper do Open Beauty Facts produz este formato). */
export type DadosCosmetico = {
  nome: string;
  /** Lista de ingredientes como está no rótulo (INCI). */
  ingredientes?: string;
  /** Selos/certificações (tags do Open Beauty Facts, ex.: "en:ecocert"). */
  selos: string[];
};

/** Pesos da metodologia v1 (docs/metodologia-cosmeticos.md, seção 3). */
export const PESOS_COSMETICO = {
  nivel: { alto: -25, moderado: -10, baixo: -3 } satisfies Record<NivelCosmetico, number>,
  /** Teto do desconto somado por nível (alto não tem teto). */
  teto: { moderado: -40, baixo: -15 } as Partial<Record<NivelCosmetico, number>>,
  certificacao: 5,
} as const;

const METODOLOGIA = 'Metodologia NutriScan (docs/metodologia-cosmeticos.md)';

const SELOS_CERTIFICACAO =
  /^en:(?:organic|eu-organic|usda-organic|ecocert.*|cosmos-.*|natrue.*|ibd.*|.*-organic-certified)$/;

const ROTULO_NIVEL: Record<NivelCosmetico, string> = {
  alto: 'Ingrediente de atenção alta',
  moderado: 'Ingrediente de atenção moderada',
  baixo: 'Preferência do autor',
};

type Achado = { grupo: GrupoCosmetico; ingredientes: string[] };

/** Analisa um cosmético pela lista de ingredientes e calcula a nota de 0 a 100. */
export function analisarCosmetico(dados: DadosCosmetico): Analysis {
  const ingredientes = lerIngredientes(dados.ingredientes);
  if (ingredientes.length === 0) {
    return { status: 'dados_insuficientes', faltando: ['lista de ingredientes'], alertas: [] };
  }

  const achados = encontrarGrupos(ingredientes);
  const itens: ScoreItem[] = [
    ...itensComTeto(achados, 'alto'),
    ...itensComTeto(achados, 'moderado'),
    ...itensComTeto(achados, 'baixo'),
    ...(certificado(dados.selos) ? [itemCertificacao()] : []),
  ];
  const soma = itens.reduce((t, i) => t + i.pontos, 0);
  const nota = Math.max(0, Math.min(100, 100 + soma));
  const base = {
    nota,
    faixa: faixaDaNota(nota),
    itens,
    alertas: achados.map(alertaDe),
    // As seções de alimentos (NOVA, Nutri-Score, lupa) não se aplicam a cosméticos.
    destaques: { nova: null, nutriScore: null, lupa: [] },
  };

  // Lista incompleta: os ingredientes que faltam só poderiam baixar a nota → ela é um teto.
  return listaPareceIncompleta(ingredientes)
    ? {
        status: 'parcial',
        ...base,
        faltando: ['lista completa de ingredientes (o cadastro parece trazer só os destaques)'],
      }
    : { status: 'completa', ...base };
}

/** Cada grupo aparece uma vez, com os ingredientes do rótulo que o ativaram. */
function encontrarGrupos(ingredientes: ReturnType<typeof lerIngredientes>): Achado[] {
  const achados: Achado[] = [];
  for (const grupo of GRUPOS_COSMETICOS) {
    const encontrados = ingredientes
      .filter((ing) => ing.formas.some((forma) => grupo.padrao.test(forma)))
      .map((ing) => ing.original);
    if (encontrados.length > 0) achados.push({ grupo, ingredientes: [...new Set(encontrados)] });
  }
  return achados;
}

function itensComTeto(achados: Achado[], nivel: NivelCosmetico): ScoreItem[] {
  const doNivel = achados.filter((a) => a.grupo.nivel === nivel);
  const itens: ScoreItem[] = doNivel.map(({ grupo, ingredientes }) => ({
    id: `cosmetico-${grupo.id}`,
    label: `${ROTULO_NIVEL[nivel]}: ${grupo.nome}`,
    pontos: grupo.pontos ?? PESOS_COSMETICO.nivel[nivel],
    motivo: `${grupo.motivo} No rótulo: ${ingredientes.join(', ')}.`,
    fonte: grupo.fonte,
    ...(grupo.exposicaoPotencial && { estimado: true }),
  }));
  const teto = PESOS_COSMETICO.teto[nivel];
  const soma = itens.reduce((t, i) => t + i.pontos, 0);
  if (teto !== undefined && soma < teto) {
    // Item explícito em vez de corte silencioso: a soma dos itens continua batendo com a nota.
    itens.push({
      id: `cosmetico-limite-${nivel}`,
      label: `Limite do nível ${nivel}`,
      pontos: teto - soma,
      motivo: `Os ingredientes de nível ${nivel} descontam no máximo ${-teto} pontos no total.`,
      fonte: METODOLOGIA,
    });
  }
  return itens;
}

function certificado(selos: string[]): boolean {
  return selos.some((s) => SELOS_CERTIFICACAO.test(s.toLowerCase()));
}

function itemCertificacao(): ScoreItem {
  return {
    id: 'cosmetico-certificacao',
    label: 'Certificação orgânica ou natural',
    pontos: PESOS_COSMETICO.certificacao,
    motivo: 'Produto com selo de certificação orgânica ou natural reconhecida.',
    fonte: METODOLOGIA,
  };
}

function alertaDe({ grupo, ingredientes }: Achado): Alert {
  return {
    id: `cosmetico-${grupo.id}`,
    titulo: grupo.nome,
    descricao: grupo.motivo,
    severidade: grupo.nivel,
    fonte: grupo.fonte,
    estimado: grupo.exposicaoPotencial ?? false,
    ingredientes,
  };
}
