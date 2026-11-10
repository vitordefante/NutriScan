import { describe, expect, it } from 'vitest';

import { codigosDaAmostra, produtoReal } from './__fixtures__/alimentos.js';
import { analisarAlimento } from './nota.js';

/**
 * Calibração: notas de produtos reais aprovadas pelo autor em 10/11/2026
 * (docs/metodologia-nota.md, seção 6). Se uma mudança nas regras alterar alguma nota,
 * este teste falha — e a mudança precisa ser revista e o documento atualizado.
 */
const ESPERADO: [codigo: string, produto: string, nota: number, status: 'completa' | 'parcial'][] =
  [
    ['7896070800014', 'Feijão carioca', 100, 'completa'],
    ['7896010604023', 'Macarrão de sêmola', 100, 'completa'],
    ['7896181711162', 'Pasta de amendoim integral', 100, 'completa'],
    ['7892840815769', 'Aveia em flocos (sem tabela)', 100, 'parcial'],
    ['7894000010021', 'Amido de milho', 83, 'completa'],
    ['7891143015425', 'Queijo frescal', 73, 'completa'],
    ['0751320828941', 'Mel', 73, 'completa'],
    ['7896496972104', 'Granola de frutas e mel', 63, 'completa'],
    ['7896004004679', 'Cereal matinal (sem tabela)', 55, 'parcial'],
    ['7896066301457', 'Pão de forma integral', 53, 'completa'],
    ['7891095031115', 'Batata palha', 53, 'completa'],
    ['7898080640611', 'Leite UHT integral', 46, 'completa'],
    ['7896487000229', 'Queijo cottage', 42, 'completa'],
    ['7891000360361', 'Iogurte grego de morango', 38, 'completa'],
    ['7891079000229', 'Lámen instantâneo (sem sódio)', 34, 'parcial'],
    ['7891991012867', 'Refrigerante de guaraná', 33, 'completa'],
    ['7891000241356', 'Biscoito recheado', 29, 'completa'],
    ['7899004741643', 'Salsicha', 23, 'completa'],
    ['7891000352175', 'Achocolatado em pó', 23, 'completa'],
    ['7894321241722', 'Achocolatado com aveia', 23, 'completa'],
    ['7891000100103', 'Leite condensado', 13, 'completa'],
    ['7894900010398', 'Refrigerante de cola', 5, 'completa'],
    ['7898024395232', 'Creme de avelã com cacau', 3, 'completa'],
    ['7894321223223', 'Barra de cereal', 0, 'completa'],
  ];

describe('calibração com produtos reais', () => {
  it.each(ESPERADO)('%s (%s) → %i', (codigo, _produto, nota, status) => {
    const analise = analisarAlimento(produtoReal(codigo));

    expect(analise.status).toBe(status);
    if (analise.status === 'dados_insuficientes') return;
    expect(analise.nota).toBe(nota);
  });

  it('cobre todos os produtos da amostra', () => {
    expect(ESPERADO.map(([codigo]) => codigo).sort()).toEqual([...codigosDaAmostra].sort());
  });
});
