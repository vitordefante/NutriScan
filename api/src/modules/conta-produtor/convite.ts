import { createHash, randomInt } from 'node:crypto';

/** Sem letras e números que se confundem (0/O, 1/I/L): o código é lido e digitado no celular. */
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const TAMANHO = 8;

/** Por quanto tempo o convite vale. */
export const VALIDADE_CONVITE_DIAS = 7;

/** "K7M2-QX9P": 31⁸ ≈ 850 bilhões de combinações (com o limite de tentativas, inadivinhável). */
export function gerarCodigo(): string {
  const letras = Array.from({ length: TAMANHO }, () => ALFABETO[randomInt(ALFABETO.length)]);
  return `${letras.slice(0, 4).join('')}-${letras.slice(4).join('')}`;
}

/** Maiúsculas, sem espaço nem hífen: "k7m2 qx9p" vale o mesmo que "K7M2-QX9P". */
export const normalizarCodigo = (codigo: string) => codigo.toUpperCase().replace(/[^A-Z0-9]/g, '');

/** Só o hash fica no banco: quem lê o banco não consegue usar um convite ainda válido. */
export const hashDoCodigo = (codigo: string) =>
  createHash('sha256').update(normalizarCodigo(codigo)).digest('hex');
