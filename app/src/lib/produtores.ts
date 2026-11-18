import type { Producer, ProducerPlace } from '@nutriscan/shared';

import { distanciaKm, type Posicao } from './localizacao';

/** O local do produtor mais perto do usuário (sem posição: o primeiro da lista). */
export function localMaisPerto(
  p: Producer,
  posicao: Posicao | null,
): { local: ProducerPlace; km: number | null } {
  if (!posicao) return { local: p.locais[0]!, km: null };
  return p.locais
    .map((local) => ({ local, km: distanciaKm(posicao, local) }))
    .reduce((a, b) => (b.km < a.km ? b : a));
}

/** Mais perto primeiro; sem posição, a ordem que veio da API (alfabética). */
export function ordenarPorDistancia(lista: readonly Producer[], posicao: Posicao | null) {
  const comDistancia = lista.map((produtor) => ({
    produtor,
    ...localMaisPerto(produtor, posicao),
  }));
  return posicao ? comDistancia.sort((a, b) => a.km! - b.km!) : comDistancia;
}

/** Chave de um ponto no mapa: produtores na mesma feira dividem o mesmo pino. */
export const chaveDoPonto = (l: Pick<ProducerPlace, 'latitude' | 'longitude'>) =>
  `${l.latitude.toFixed(4)},${l.longitude.toFixed(4)}`;

/** "Feira do Bairro · Sábado, 7h às 12h" (ou a cidade, sem nome nem horário). */
export function resumoDoLocal(l: ProducerPlace): string {
  return [l.nome ?? l.cidade, l.horario].filter(Boolean).join(' · ');
}

/** Link do WhatsApp com uma mensagem pronta. */
export const linkWhatsApp = (numero: string, nome: string) =>
  `https://wa.me/${numero}?text=${encodeURIComponent(`Olá, ${nome}! Encontrei vocês no NutriScan.`)}`;
