import { createHash } from 'node:crypto';

import sharp from 'sharp';

/** Lado maior da foto publicada: nítida em tela cheia no celular, ~200–400 KB. */
export const LADO_MAXIMO = 1600;

export type FotoPreparada = { id: string; bytes: Buffer; largura: number; altura: number };

/** O id de uma foto: o hash do conteúdo publicado (32 caracteres hexadecimais). */
export const ehIdDeFoto = (id: string) => /^[0-9a-f]{32}$/.test(id);

/**
 * Prepara uma foto para publicar: gira conforme a orientação do celular, reduz para no máximo
 * LADO_MAXIMO e regrava em JPEG **sem metadados** — o EXIF de uma foto de celular traz a posição
 * GPS de onde ela foi tirada (a casa do produtor) e o modelo do aparelho.
 */
export async function prepararFoto(entrada: Buffer | string): Promise<FotoPreparada> {
  const { data, info } = await sharp(entrada)
    .rotate()
    .resize({
      width: LADO_MAXIMO,
      height: LADO_MAXIMO,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });
  const id = createHash('sha256').update(data).digest('hex').slice(0, 32);
  return { id, bytes: data, largura: info.width, altura: info.height };
}
