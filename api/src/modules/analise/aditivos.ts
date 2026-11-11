import type { Alimento } from './alimento.js';
import { ADOCANTES, CODIGOS_ADOCANTES } from './texto.js';

export type NivelAditivo = 'alto' | 'moderado' | 'baixo';

export type GrupoAditivo = {
  id: string;
  nome: string;
  nivel: NivelAditivo;
  /** Códigos INS/E em minúsculas (ex.: "e250"). */
  codigos: string[];
  /** Como o aditivo aparece escrito em rótulos brasileiros (texto já sem acentos). */
  nomesNoRotulo: RegExp;
  motivo: string;
  fonte: string;
};

const faixa = (de: number, ate: number) =>
  Array.from({ length: ate - de + 1 }, (_, i) => `e${de + i}`);

/** Lista curada (docs/metodologia-nota.md, seção 5). Cada grupo desconta uma vez. */
export const GRUPOS_ADITIVOS: GrupoAditivo[] = [
  {
    id: 'nitritos-nitratos',
    nome: 'Nitritos e nitratos',
    nivel: 'alto',
    codigos: faixa(249, 252),
    // Formas de vitamina como "nitrato de tiamina" são removidas antes (ver FORMAS_DE_VITAMINA).
    nomesNoRotulo: /nitrito|nitrato/,
    motivo: 'Formam nitrosaminas; a carne processada é classificada como cancerígena (Grupo 1).',
    fonte: 'IARC, Monografia 114 (2018); EFSA (2017)',
  },
  {
    id: 'dioxido-titanio',
    nome: 'Dióxido de titânio',
    nivel: 'alto',
    codigos: ['e171'],
    nomesNoRotulo: /dioxido de titanio/,
    motivo: 'Genotoxicidade não descartada; proibido como aditivo na União Europeia.',
    fonte: 'EFSA (2021); Regulamento (UE) 2022/63',
  },
  {
    id: 'bha',
    nome: 'BHA',
    nivel: 'alto',
    codigos: ['e320'],
    nomesNoRotulo: /\bbha\b|butil-?hidroxianisol/,
    motivo: 'Possivelmente cancerígeno para humanos (Grupo 2B).',
    fonte: 'IARC, Monografia 40',
  },
  {
    id: 'corantes-azoicos',
    nome: 'Corantes azoicos',
    nivel: 'moderado',
    codigos: ['e102', 'e110', 'e122', 'e124', 'e129'],
    nomesNoRotulo: /tartrazina|amarelo crepusculo|azorrubina|ponceau|vermelho 40|vermelho allura/,
    motivo: 'Associados a hiperatividade em crianças; na UE exigem aviso no rótulo.',
    fonte: 'McCann et al., The Lancet (2007); Regulamento (CE) 1333/2008',
  },
  {
    id: 'caramelo-amonico',
    nome: 'Caramelo amônico (III/IV)',
    nivel: 'moderado',
    codigos: ['e150c', 'e150d'],
    nomesNoRotulo: /caramelo (iii|iv|amoni)/,
    motivo: 'Contém 4-MEI, possivelmente cancerígeno (Grupo 2B).',
    fonte: 'IARC, Monografia 101',
  },
  {
    id: 'bht',
    nome: 'BHT',
    nivel: 'moderado',
    codigos: ['e321'],
    nomesNoRotulo: /\bbht\b|butil-?hidroxitolueno/,
    motivo: 'Antioxidante sintético com dúvidas sobre efeitos endócrinos.',
    fonte: 'EFSA (2012)',
  },
  {
    id: 'aspartame',
    nome: 'Aspartame',
    nivel: 'moderado',
    codigos: ['e951'],
    nomesNoRotulo: /aspartame/,
    motivo: 'Possivelmente cancerígeno (Grupo 2B).',
    fonte: 'IARC (2023)',
  },
  {
    id: 'adocantes-artificiais',
    nome: 'Adoçantes artificiais',
    nivel: 'moderado',
    codigos: ['e950', 'e952', 'e954', 'e955'],
    nomesNoRotulo: /acessulfame|ciclamato|sacarina|sucralose/,
    motivo: 'A OMS recomenda não usar adoçantes não calóricos.',
    fonte: 'OMS, diretriz sobre adoçantes não açucarados (2023)',
  },
  {
    id: 'carragena',
    nome: 'Carragena',
    nivel: 'moderado',
    codigos: ['e407'],
    nomesNoRotulo: /carragena|carragenina/,
    motivo: 'Incertezas sobre inflamação intestinal.',
    fonte: 'EFSA (2018)',
  },
  {
    id: 'emulsificantes-microbiota',
    nome: 'Polissorbato 80 / carboximetilcelulose',
    nivel: 'moderado',
    codigos: ['e433', 'e466'],
    nomesNoRotulo: /polissorbato|carboximetilcelulose/,
    motivo: 'Alteram a microbiota intestinal em estudos; associação com doença cardiovascular.',
    fonte: 'Chassaing et al., Nature (2015); Sellem et al., BMJ (2023)',
  },
  {
    id: 'fosfatos',
    nome: 'Fosfatos adicionados',
    nivel: 'moderado',
    codigos: [...faixa(338, 341), ...faixa(450, 452)],
    nomesNoRotulo: /fosfat|fosforico/,
    motivo: 'A ingestão pode exceder a dose segura, especialmente em crianças.',
    fonte: 'EFSA (2019)',
  },
  {
    id: 'sulfitos',
    nome: 'Sulfitos',
    nivel: 'moderado',
    codigos: faixa(220, 228),
    nomesNoRotulo: /sulfito|dioxido de enxofre/,
    motivo: 'Podem desencadear reações em pessoas com asma.',
    fonte: 'EFSA (2016)',
  },
  {
    id: 'realcadores',
    nome: 'Glutamato e realçadores de sabor',
    nivel: 'baixo',
    codigos: ['e621', 'e627', 'e631', 'e635'],
    nomesNoRotulo: /glutamato|inosinato|guanilato|ribonucleotideo/,
    motivo: 'Seguro dentro da dose diária; marcador de produto muito processado.',
    fonte: 'EFSA (2017)',
  },
  {
    id: 'benzoatos',
    nome: 'Benzoatos',
    nivel: 'baixo',
    codigos: faixa(210, 213),
    nomesNoRotulo: /benzoato|acido benzoico/,
    motivo: 'Podem formar benzeno junto com vitamina C.',
    fonte: 'EFSA (2016)',
  },
  {
    id: 'sorbatos',
    nome: 'Sorbatos',
    nivel: 'baixo',
    codigos: faixa(200, 203),
    nomesNoRotulo: /sorbato|acido sorbico/,
    motivo: 'Conservante com dose diária aceitável definida.',
    fonte: 'EFSA (2019)',
  },
  {
    id: 'propionatos',
    nome: 'Propionatos',
    nivel: 'baixo',
    codigos: faixa(280, 283),
    nomesNoRotulo: /propionato|acido propionico/,
    motivo: 'Conservante com dose diária aceitável definida.',
    fonte: 'EFSA (2014)',
  },
  {
    id: 'poliois',
    nome: 'Polióis',
    nivel: 'baixo',
    codigos: ['e420', 'e421', 'e965', 'e966', 'e967'],
    nomesNoRotulo: /sorbitol|manitol|maltitol|lactitol|xilitol/,
    motivo: 'Efeito laxativo em excesso.',
    fonte: 'EFSA',
  },
];

/** "e341i" é uma variante de "e341"; mas "e1500" não é variante de "e150". */
const ehVariante = (tag: string, codigo: string) =>
  tag.startsWith(codigo) && !/\d/.test(tag[codigo.length] ?? '');

/**
 * Vitaminas cujo nome químico contém "nitrato" ou "fosfato" mas que não são os aditivos da lista:
 * vitamina B1 (mononitrato/nitrato de tiamina), B2 (riboflavina 5'-fosfato) e B6 (fosfato de
 * piridoxal). São removidas do texto antes da busca por nomes.
 */
const FORMAS_DE_VITAMINA =
  /(?:mono)?nitrato de tiamina|tiamina[\s-]*(?:mono)?nitrato|riboflavina[\s-]*5?'?[\s-]*fosfato(?: sodic[oa])?|fosfato de riboflavina|fosfato de piridoxal|piridoxal[\s-]*5?'?[\s-]*fosfato/g;

/** Grupos encontrados pelos códigos informados pela fonte ou pelos nomes na lista de ingredientes. */
export function detectarAditivos(alimento: Alimento): GrupoAditivo[] {
  const texto = alimento.textoIngredientes.replace(FORMAS_DE_VITAMINA, '');
  return GRUPOS_ADITIVOS.filter(
    (g) =>
      alimento.aditivos.some((tag) => g.codigos.some((c) => ehVariante(tag, c))) ||
      g.nomesNoRotulo.test(texto),
  );
}

/** Edulcorante presente? (o Nutri-Score de bebidas penaliza adoçantes). */
export function temAdocante(alimento: Alimento): boolean {
  return (
    alimento.aditivos.some((tag) => CODIGOS_ADOCANTES.some((c) => ehVariante(tag, c))) ||
    ADOCANTES.test(alimento.textoIngredientes)
  );
}
