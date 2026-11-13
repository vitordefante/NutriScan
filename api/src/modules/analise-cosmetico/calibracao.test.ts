import { describe, expect, it } from 'vitest';

import { paraDadosCosmetico, produtoOffSchema } from '../produtos/open-food-facts.mapper.js';
import amostra from './__fixtures__/obf-amostra.json' with { type: 'json' };
import { analisarCosmetico } from './nota.js';

/**
 * Calibração: notas de cosméticos reais vendidos no Brasil aprovadas pelo autor em 12/11/2026
 * (docs/metodologia-cosmeticos.md). Se uma mudança nas regras alterar alguma nota, este teste
 * falha — e a mudança precisa ser revista e o documento atualizado.
 */
const ESPERADO: [codigo: string, produto: string, nota: number, status: 'completa' | 'parcial'][] =
  [
    ['4005900915900', 'Nivea Q10, creme para olhos', 100, 'completa'],
    ['7898516730589', 'Live Aloe, gel de aloe', 100, 'completa'],
    ['7898623951785', 'Salon Line, máscara (só destaques)', 100, 'parcial'],
    ['7891317024789', 'NeutroDerm, creme dental', 94, 'completa'],
    ['7891024134610', 'Colgate, creme dental', 91, 'completa'],
    ['7908132258012', 'Natura Ekos Maracujá', 87, 'completa'],
    ['7896512905222', 'Granado, sabonete de glicerina', 87, 'completa'],
    ['4005900633309', 'Nivea Men, desodorante', 87, 'completa'],
    ['7891150049628', 'Seda, shampoo', 84, 'completa'],
    ['7897622317370', 'New Carinho, lenço umedecido', 84, 'completa'],
    ['7899706180924', 'Elseve, shampoo', 78, 'completa'],
    ['7891150102613', 'Dove, shampoo', 75, 'completa'],
    ['4005808846290', 'Nivea, creme para mãos', 74, 'completa'],
    ['4005900201126', 'Nivea Sun, protetor facial', 71, 'completa'],
    ['7899563258781', 'Natura Plant, shampoo', 65, 'completa'],
    ['7891010250980', 'Neutrogena Sun Fresh, protetor', 65, 'completa'],
    ['7896115702679', 'Trá Lá Lá Kids, shampoo', 59, 'completa'],
    ['7891035913099', 'Veet for Men, creme depilatório', 43, 'completa'],
  ];

function cosmeticoReal(codigo: string) {
  const bruto = amostra.produtos.find((p) => p.code === codigo);
  if (!bruto) throw new Error(`Produto ${codigo} não está em obf-amostra.json`);
  return paraDadosCosmetico(produtoOffSchema.parse(bruto));
}

describe('calibração com cosméticos reais', () => {
  it.each(ESPERADO)('%s (%s) → %i', (codigo, _produto, nota, status) => {
    const analise = analisarCosmetico(cosmeticoReal(codigo));

    expect(analise.status).toBe(status);
    if (analise.status === 'dados_insuficientes') return;
    expect(analise.nota).toBe(nota);
  });

  it('cobre todos os produtos da amostra', () => {
    expect(ESPERADO.map(([codigo]) => codigo).sort()).toEqual(
      amostra.produtos.map((p) => p.code).sort(),
    );
  });

  it('a nota é sempre 100 + a soma dos itens, limitada a 0–100', () => {
    for (const p of amostra.produtos) {
      const a = analisarCosmetico(cosmeticoReal(p.code));
      if (a.status === 'dados_insuficientes') continue;
      const soma = a.itens.reduce((t, i) => t + i.pontos, 0);
      expect(a.nota, p.code).toBe(Math.max(0, Math.min(100, 100 + soma)));
    }
  });
});
