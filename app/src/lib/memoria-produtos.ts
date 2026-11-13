import type { ProductResult } from '@nutriscan/shared';

/**
 * Memória curta dos produtos recém-buscados. Serve para a tela "Por que essa nota" abrir na
 * hora com o mesmo produto que o resultado acabou de mostrar, e para o resultado se atualizar
 * sozinho depois do envio das fotos do rótulo — não é um cache de longo prazo (esse fica na
 * API): expira em minutos, guarda poucos itens e ignora respostas desatualizadas.
 */
export type ItemMemoria = { dados: ProductResult; em: number };

const VALIDADE_MS = 10 * 60 * 1000;
const MAXIMO = 20;
const memoria = new Map<string, ItemMemoria>();
const ouvintes = new Set<() => void>();

/**
 * O item guardado — o mesmo objeto enquanto não for substituído, como `useSyncExternalStore`
 * exige. A validade é conferida à parte, com `aindaValido`.
 */
export function itemNaMemoria(barcode: string): ItemMemoria | undefined {
  return memoria.get(barcode);
}

export function aindaValido(item: ItemMemoria | undefined): item is ItemMemoria {
  return item !== undefined && Date.now() - item.em < VALIDADE_MS;
}

export function guardarNaMemoria(barcode: string, dados: ProductResult) {
  // Cópia antiga (fonte estava fora do ar): não guarda, para buscar de novo da próxima vez.
  if (dados.desatualizado) return;
  memoria.delete(barcode); // reinserir coloca no fim (o mais recente)
  memoria.set(barcode, { dados, em: Date.now() });
  if (memoria.size > MAXIMO) memoria.delete(memoria.keys().next().value!);
  for (const avisar of ouvintes) avisar();
}

/** Para `useSyncExternalStore`: avisa quando algum produto é guardado. */
export function assinarMemoria(avisar: () => void): () => void {
  ouvintes.add(avisar);
  return () => ouvintes.delete(avisar);
}
