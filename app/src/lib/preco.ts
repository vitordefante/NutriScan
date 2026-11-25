import type { PriceUnit, ProducerPrice } from '@nutriscan/shared';

/** Unidades na ordem do seletor, com o rótulo que aparece no app. */
export const UNIDADES: readonly { valor: PriceUnit; rotulo: string }[] = [
  { valor: 'unidade', rotulo: 'unidade' },
  { valor: 'kg', rotulo: 'kg' },
  { valor: 'litro', rotulo: 'litro' },
  { valor: 'duzia', rotulo: 'dúzia' },
  { valor: 'bandeja', rotulo: 'bandeja' },
  { valor: 'pacote', rotulo: 'pacote' },
  { valor: 'pote', rotulo: 'pote' },
  { valor: 'garrafa', rotulo: 'garrafa' },
  { valor: 'maco', rotulo: 'maço' },
  { valor: 'caixa', rotulo: 'caixa' },
];

const ROTULO = Object.fromEntries(UNIDADES.map((u) => [u.valor, u.rotulo])) as Record<
  PriceUnit,
  string
>;

/** Mesmo limite da API: R$ 99.999,99. */
export const MAXIMO_CENTAVOS = 9_999_999;

/** "R$ 10,50" */
export const formatarReais = (centavos: number) =>
  (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** "R$ 10,50 / litro" */
export const formatarPreco = ({ centavos, unidade }: ProducerPrice) =>
  `${formatarReais(centavos)} / ${ROTULO[unidade]}`;

/** "10,50" (para pôr no campo de edição). */
export const textoDoValor = (centavos: number) =>
  (centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * O que o produtor digitou ("10,5", "10.50", "R$ 1.234,00") em centavos; null se não for um
 * valor entre R$ 0,01 e R$ 99.999,99.
 */
export function centavosDoTexto(texto: string): number | null {
  const limpo = texto.replace(/[R$\s]/g, '');
  // Com vírgula, ela é a decimal e os pontos são milhar; sem vírgula, um ponto com 1–2 casas
  // no fim é a decimal ("10.5").
  const normalizado = limpo.includes(',')
    ? limpo.replace(/\./g, '').replace(',', '.')
    : /^\d+\.\d{1,2}$/.test(limpo)
      ? limpo
      : limpo.replace(/\./g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(normalizado)) return null;
  const centavos = Math.round(Number(normalizado) * 100);
  return centavos >= 1 && centavos <= MAXIMO_CENTAVOS ? centavos : null;
}
