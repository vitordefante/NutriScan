import Svg, { Path } from 'react-native-svg';

import { cores } from '@/theme/tokens';

/**
 * Ícones pixel art desenhados numa grade (cada unidade do viewBox = 1 pixel).
 * Os caminhos foram gerados a partir de grades ASCII — ver o protótipo no canvas do design.
 */
const ICONES = {
  escanear: {
    w: 12,
    h: 12,
    d: 'M0 0h3v1h-3zM9 0h3v1h-3zM0 1h1v1h-1zM11 1h1v1h-1zM0 2h1v1h-1zM11 2h1v1h-1zM2 3h1v1h-1zM4 3h1v1h-1zM6 3h2v1h-2zM9 3h1v1h-1zM2 4h1v1h-1zM4 4h1v1h-1zM6 4h2v1h-2zM9 4h1v1h-1zM2 5h1v1h-1zM4 5h1v1h-1zM6 5h2v1h-2zM9 5h1v1h-1zM2 6h1v1h-1zM4 6h1v1h-1zM6 6h2v1h-2zM9 6h1v1h-1zM2 7h1v1h-1zM4 7h1v1h-1zM6 7h2v1h-2zM9 7h1v1h-1zM2 8h1v1h-1zM4 8h1v1h-1zM6 8h2v1h-2zM9 8h1v1h-1zM0 9h1v1h-1zM11 9h1v1h-1zM0 10h1v1h-1zM11 10h1v1h-1zM0 11h3v1h-3zM9 11h3v1h-3z',
  },
  lupa: {
    w: 12,
    h: 12,
    d: 'M2 0h4v1h-4zM1 1h1v1h-1zM6 1h1v1h-1zM0 2h1v1h-1zM7 2h1v1h-1zM0 3h1v1h-1zM7 3h1v1h-1zM0 4h1v1h-1zM7 4h1v1h-1zM0 5h1v1h-1zM7 5h1v1h-1zM1 6h1v1h-1zM6 6h1v1h-1zM2 7h6v1h-6zM7 8h2v1h-2zM8 9h2v1h-2zM9 10h2v1h-2zM10 11h2v1h-2z',
  },
  alerta: {
    w: 12,
    h: 12,
    d: 'M5 0h2v1h-2zM5 1h2v1h-2zM4 2h1v1h-1zM7 2h1v1h-1zM4 3h1v1h-1zM7 3h1v1h-1zM3 4h1v1h-1zM5 4h2v1h-2zM8 4h1v1h-1zM3 5h1v1h-1zM5 5h2v1h-2zM8 5h1v1h-1zM2 6h1v1h-1zM5 6h2v1h-2zM9 6h1v1h-1zM2 7h1v1h-1zM5 7h2v1h-2zM9 7h1v1h-1zM1 8h1v1h-1zM10 8h1v1h-1zM1 9h1v1h-1zM5 9h2v1h-2zM10 9h1v1h-1zM0 10h1v1h-1zM11 10h1v1h-1zM0 11h12v1h-12z',
  },
  coracao: {
    w: 9,
    h: 8,
    d: 'M1 0h2v1h-2zM6 0h2v1h-2zM0 1h4v1h-4zM5 1h4v1h-4zM0 2h9v1h-9zM0 3h9v1h-9zM1 4h7v1h-7zM2 5h5v1h-5zM3 6h3v1h-3zM4 7h1v1h-1z',
  },
  voltar: {
    w: 12,
    h: 9,
    d: 'M4 0h1v1h-1zM3 1h2v1h-2zM2 2h1v1h-1zM4 2h1v1h-1zM1 3h1v1h-1zM4 3h8v1h-8zM0 4h1v1h-1zM11 4h1v1h-1zM1 5h1v1h-1zM4 5h8v1h-8zM2 6h1v1h-1zM4 6h1v1h-1zM3 7h2v1h-2zM4 8h1v1h-1z',
  },
  teclado: {
    w: 12,
    h: 9,
    d: 'M0 0h12v1h-12zM0 1h1v1h-1zM11 1h1v1h-1zM0 2h1v1h-1zM2 2h1v1h-1zM4 2h1v1h-1zM6 2h1v1h-1zM8 2h1v1h-1zM11 2h1v1h-1zM0 3h1v1h-1zM11 3h1v1h-1zM0 4h1v1h-1zM2 4h1v1h-1zM4 4h1v1h-1zM6 4h1v1h-1zM8 4h1v1h-1zM11 4h1v1h-1zM0 5h1v1h-1zM11 5h1v1h-1zM0 6h1v1h-1zM3 6h6v1h-6zM11 6h1v1h-1zM0 7h1v1h-1zM11 7h1v1h-1zM0 8h12v1h-12z',
  },
  raio: {
    w: 12,
    h: 10,
    d: 'M6 0h3v1h-3zM5 1h3v1h-3zM4 2h3v1h-3zM3 3h3v1h-3zM2 4h7v1h-7zM5 5h3v1h-3zM4 6h3v1h-3zM3 7h2v1h-2zM2 8h2v1h-2zM1 9h1v1h-1z',
  },
} as const;

export type NomeIconePixel = keyof typeof ICONES;

type Props = {
  nome: NomeIconePixel;
  /** Tamanho de cada pixel do desenho, em pontos (2 = ícone de 24 pt para uma grade de 12). */
  escala?: number;
  cor?: string;
};

export function IconePixel({ nome, escala = 2, cor = cores.tinta }: Props) {
  const { w, h, d } = ICONES[nome];
  return (
    // Com escala inteira, cada pixel do desenho cai em pontos inteiros e as bordas ficam nítidas.
    <Svg width={w * escala} height={h * escala} viewBox={`0 0 ${w} ${h}`} accessible={false}>
      <Path d={d} fill={cor} />
    </Svg>
  );
}
