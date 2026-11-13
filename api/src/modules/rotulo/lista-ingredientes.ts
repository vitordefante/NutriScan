import type { LabelLine } from '@nutriscan/shared';

import { normalizar } from '../analise/texto.js';

/**
 * Onde a lista começa: "Ingredientes:" (alimentos) ou "Ingredients:", "Composição:", "INCI:"
 * (cosméticos). O OCR às vezes troca ":" por ";" ou "." ou o perde.
 */
const INICIO = /\b(?:ingredientes?|ingredients?|composicao|composition|inci)\b\s*[:;.]?/;

/**
 * Onde a lista termina: textos que costumam vir logo depois dela no rótulo
 * (alergênicos, glúten, modo de uso, conservação, lote, validade, SAC…).
 */
const FIM =
  /\b(?:alergicos|alergenicos|contem gluten|nao contem gluten|contem lactose|nao contem lactose|pode conter|informacao nutricional|modo de (?:uso|preparo|usar)|precaucoes|advertencias?|atencao|conservar|conserve|validade|lote|fabricado|fabricacao|industria brasileira|sac\b|registro|responsavel tecnico|peso liquido|conteudo)/;

/**
 * Texto da lista de ingredientes a partir das linhas lidas na foto, ou undefined se não houver
 * nada que pareça uma lista.
 *
 * O texto devolvido mantém acentos e maiúsculas do rótulo (os motores normalizam por conta
 * própria). As posições no texto original e no normalizado coincidem porque `normalizar` só
 * remove marcas de acento, que já vêm compostas (NFC) do OCR.
 */
export function extrairListaIngredientes(linhas: readonly LabelLine[]): string | undefined {
  const texto = juntarLinhas(linhas.map((l) => l.texto)).normalize('NFC');
  const norm = normalizar(texto);
  if (norm.length !== texto.length) return limpar(texto); // segurança: sem mapeamento de posições

  const inicio = INICIO.exec(norm);
  const de = inicio ? inicio.index + inicio[0].length : 0;
  const fim = FIM.exec(norm.slice(de));
  const ate = fim ? de + fim.index : texto.length;
  return limpar(texto.slice(de, ate));
}

/**
 * Junta as linhas do OCR num parágrafo: palavra hifenizada no fim da linha é emendada
 * ("estabi-" + "lizante" → "estabilizante"); as demais linhas ganham um espaço.
 */
export function juntarLinhas(linhas: readonly string[]): string {
  let texto = '';
  for (const linha of linhas.map((l) => l.trim()).filter(Boolean)) {
    if (/[a-zà-ú]-$/i.test(texto) && /^[a-zà-ú]/.test(linha)) texto = texto.slice(0, -1) + linha;
    else texto = texto ? `${texto} ${linha}` : linha;
  }
  return texto;
}

function limpar(texto: string): string | undefined {
  const t = texto
    .replace(/\s+/g, ' ')
    .replace(/^[\s:;.,-]+|[\s:;,-]+$/g, '')
    .trim();
  return /\p{L}{2,}/u.test(t) ? t : undefined;
}
