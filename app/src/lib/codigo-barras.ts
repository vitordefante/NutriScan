/**
 * Normaliza o que veio do leitor ou do teclado: só dígitos, de 8 a 14 (EAN-8, UPC-A, EAN-13,
 * GTIN-14). Devolve null se não parece um código de produto.
 */
export function normalizarCodigo(bruto: string): string | null {
  const codigo = bruto.replace(/\D/g, '');
  return /^\d{8,14}$/.test(codigo) ? codigo : null;
}
