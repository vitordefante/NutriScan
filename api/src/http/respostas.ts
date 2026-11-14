import type { ApiError } from '@nutriscan/shared';
import { z } from 'zod';

/** Parâmetro de rota com o código de barras: EAN-8, UPC-A (12), EAN-13 ou GTIN-14, só dígitos. */
export const paramsBarcode = z.object({ barcode: z.string().regex(/^\d{8,14}$/) });

/** Corpo das respostas de erro da API. */
export const erro = (codigo: ApiError['erro'], mensagem: string): ApiError => ({
  erro: codigo,
  mensagem,
});
