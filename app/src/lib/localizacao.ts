import * as Location from 'expo-location';
import { useSyncExternalStore } from 'react';

/**
 * Posição do usuário, só para ordenar os produtores por distância. Fica no aparelho: a API
 * devolve todos os produtores e a conta da distância é feita aqui.
 */

export type Posicao = { latitude: number; longitude: number };

export type EstadoLocalizacao =
  { status: 'desconhecida' } | { status: 'negada' } | { status: 'ok'; posicao: Posicao };

let estado: EstadoLocalizacao = { status: 'desconhecida' };
const ouvintes = new Set<() => void>();
function mudar(novo: EstadoLocalizacao) {
  estado = novo;
  for (const f of ouvintes) f();
}
function assinar(f: () => void) {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
}

/** Uma posição de até 10 minutos atrás serve (feira não sai do lugar); senão, pede uma nova. */
async function lerPosicao(): Promise<void> {
  const recente = await Location.getLastKnownPositionAsync({ maxAge: 10 * 60_000 });
  const p =
    recente ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
  mudar({ status: 'ok', posicao: { latitude: p.coords.latitude, longitude: p.coords.longitude } });
}

/** Pede a permissão (se ainda não foi pedida) e lê a posição. Usado na aba Mapa. */
export async function pedirLocalizacao(): Promise<void> {
  try {
    const { granted } = await Location.requestForegroundPermissionsAsync();
    if (!granted) return mudar({ status: 'negada' });
    await lerPosicao();
  } catch {
    // GPS desligado ou sem sinal: a lista fica em ordem alfabética.
  }
}

/** Lê a posição só se a permissão já foi dada (não abre o pedido). Usado na tela do produto. */
export async function localizacaoSemPedir(): Promise<void> {
  if (estado.status === 'ok') return;
  try {
    const { granted } = await Location.getForegroundPermissionsAsync();
    if (granted) await lerPosicao();
  } catch {
    // idem
  }
}

export function useLocalizacao(): EstadoLocalizacao {
  return useSyncExternalStore(assinar, () => estado);
}

/** Distância em linha reta (fórmula de haversine), em km. */
export function distanciaKm(a: Posicao, b: Posicao): number {
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/** "800 m", "3,2 km", "25 km". */
export function formatarDistancia(km: number): string {
  // Arredonda antes de escolher a unidade: 970 m vira "1 km", não "1000 m".
  const metros = Math.max(100, Math.round(km * 10) * 100);
  if (metros < 1000) return `${metros} m`;
  if (km < 10) return `${km.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km`;
  return `${Math.round(km)} km`;
}
