import type { NovaGroup, NutriScoreLetter, ScoreBand } from '@nutriscan/shared';

/** Tokens do design system v0 — ver docs/design-system.md (o "porquê" de cada valor). */

export const cores = {
  tinta: '#1F1F1F',
  papel: '#FFFFFF',
  grafite: '#5E5E5E',
  /** Texto de apoio menos importante (ainda passa 4.5:1 no branco). */
  cinza: '#6B6B6B',
  vazio: '#EBEBEB',
  /** Blocos vazios da barra de HP sobre fundo tinta (cartão "Nota final"). */
  vazioEscuro: '#3A3A3A',
  linhaPontilhada: '#BDB8AA',
  destaque: '#ADEBB3',
  coral: '#FF6B4A',
  coralClaro: '#FFD9CF',
  avisoClaro: '#FFF3C4',
  camera: '#2B2B2B',
  textoSobreTinta: '#D8D8D8',
} as const;

/** Fontes carregadas em app/_layout.tsx. Com fontes customizadas, cada peso é uma família. */
export const fontes = {
  texto: 'SpaceGrotesk_400Regular',
  textoMedio: 'SpaceGrotesk_500Medium',
  textoNegrito: 'SpaceGrotesk_700Bold',
  pixel: 'Silkscreen_400Regular',
} as const;

export const espaco = {
  borda: 2,
  sombraBotao: 6,
  sombraBotaoPequeno: 3,
  margemTela: 24,
} as const;

type CorFaixa = { rotulo: string; preenchimento: string; texto: string };

/** Preenchimento = barra/etiqueta; texto = tom mais escuro com contraste no branco. */
export const faixas: Record<ScoreBand, CorFaixa> = {
  excelente: { rotulo: 'EXCELENTE', preenchimento: '#1F8A4C', texto: '#1A7A43' },
  bom: { rotulo: 'BOM', preenchimento: '#8BC34A', texto: '#4F7A1F' },
  regular: { rotulo: 'REGULAR', preenchimento: '#F5C542', texto: '#8A6A00' },
  ruim: { rotulo: 'RUIM', preenchimento: '#F08C2E', texto: '#B35C12' },
  pessimo: { rotulo: 'PÉSSIMO', preenchimento: '#D93F3F', texto: '#C62F2F' },
};

/** Cor de cada grupo NOVA (texto e quadradinhos usam a mesma cor). */
export const coresNova: Record<NovaGroup, string> = {
  1: '#1A7A43',
  2: '#4F7A1F',
  3: '#B35C12',
  4: '#C62F2F',
};

export const coresNutriScore: Record<NutriScoreLetter, string> = {
  A: '#1F8A4C',
  B: '#8BC34A',
  C: '#F5C542',
  D: '#F08C2E',
  E: '#D93F3F',
};
