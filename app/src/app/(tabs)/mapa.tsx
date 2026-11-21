import type { Producer, ProducerCategory, ProducerPlace } from '@nutriscan/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { CartaoProdutor } from '@/components/produtores/cartao-produtor';
import { FiltroCategorias } from '@/components/produtores/filtro-categorias';
import { PinoMapa } from '@/components/produtores/pino-mapa';
import { Botao } from '@/components/ui/botao';
import { CabecalhoTela } from '@/components/ui/cabecalho-tela';
import { Tela } from '@/components/ui/tela';
import { Texto } from '@/components/ui/texto';
import { useProdutores } from '@/hooks/use-produtores';
import { CATEGORIAS, NOME_CATEGORIA, TIPO_LOCAL } from '@/lib/categorias-produtor';
import { distanciaKm, pedirLocalizacao, useLocalizacao } from '@/lib/localizacao';
import { chaveDoPonto, ordenarPorDistancia } from '@/lib/produtores';
import { cores, espaco, fontes } from '@/theme/tokens';

/** Um pino: um lugar do mapa e os produtores que vendem ali (uma feira pode ter vários). */
type Ponto = { chave: string; local: ProducerPlace; produtores: Producer[] };

function pontosDoMapa(lista: readonly Producer[]): Ponto[] {
  const porChave = new Map<string, Ponto>();
  for (const p of lista) {
    for (const local of p.locais) {
      const chave = chaveDoPonto(local);
      const ponto = porChave.get(chave) ?? { chave, local, produtores: [] };
      if (!ponto.produtores.includes(p)) ponto.produtores.push(p);
      porChave.set(chave, ponto);
    }
  }
  return [...porChave.values()];
}

/** Se o usuário está a mais que isso do produtor mais perto, o mapa enquadra só os produtores. */
const RAIO_ENQUADRAR_KM = 60;

/** Aba Mapa: produtores rurais, filtro por categoria e a lista (mais perto primeiro). */
export default function TelaMapa() {
  const { estado, tentarDeNovo } = useProdutores();
  const localizacao = useLocalizacao();
  const posicao = localizacao.status === 'ok' ? localizacao.posicao : null;
  const { height } = useWindowDimensions();
  const mapa = useRef<MapView>(null);

  // O filtro pode chegar pela tela do produto ("ver no mapa": /mapa?categoria=ovos).
  const { categoria: doLink } = useLocalSearchParams<{ categoria?: ProducerCategory }>();
  const [filtro, setFiltro] = useState<ProducerCategory | null>(doLink ?? null);
  const [linkAplicado, setLinkAplicado] = useState(doLink);
  if (doLink !== linkAplicado) {
    setLinkAplicado(doLink);
    setFiltro(doLink ?? null);
  }
  const [selecionado, setSelecionado] = useState<string | null>(null);

  useEffect(() => {
    void pedirLocalizacao();
  }, []);

  const todos = estado.status === 'pronto' ? estado.dados : [];
  const presentes = CATEGORIAS.filter((c) => todos.some((p) => p.categorias.includes(c)));
  const filtrados = filtro ? todos.filter((p) => p.categorias.includes(filtro)) : todos;
  const pontos = pontosDoMapa(filtrados);
  const ponto = pontos.find((p) => p.chave === selecionado) ?? null;

  // Com um pino escolhido, a lista mostra quem vende ali (com aquele local); senão, todos.
  const linhas = ponto
    ? ponto.produtores.map((produtor) => ({
        produtor,
        local: ponto.local,
        km: posicao ? distanciaKm(posicao, ponto.local) : null,
      }))
    : ordenarPorDistancia(filtrados, posicao);

  // Enquadra os pinos (e o usuário, se ele estiver na região) quando a lista ou o filtro mudam.
  const enquadramento = pontos.map((p) => p.chave).join('|');
  const perto =
    posicao && pontos.some((p) => distanciaKm(posicao, p.local) < RAIO_ENQUADRAR_KM)
      ? posicao
      : null;
  useEffect(() => {
    const coordenadas = [
      ...pontos.map(({ local: { latitude, longitude } }) => ({ latitude, longitude })),
      ...(perto ? [perto] : []),
    ];
    if (coordenadas.length === 0) return;
    mapa.current?.fitToCoordinates(coordenadas, {
      edgePadding: { top: 60, right: 50, bottom: 50, left: 50 },
      animated: true,
    });
    // Só quando o conjunto de pinos muda (ou a posição chega), não a cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enquadramento, perto?.latitude, perto?.longitude]);

  return (
    <Tela comAbas>
      <CabecalhoTela titulo="PRODUTORES LOCAIS" />
      <FiltroCategorias
        categorias={presentes}
        valor={filtro}
        onMudar={(c) => {
          setFiltro(c);
          setSelecionado(null);
        }}
      />
      <View style={[estilos.mapa, { height: Math.round(height * 0.36) }]}>
        <MapView
          ref={mapa}
          style={StyleSheet.absoluteFill}
          // Região inicial: Jaraguá do Sul, até os produtores carregarem (depois o mapa
          // enquadra os pinos).
          initialRegion={{
            latitude: -26.4853,
            longitude: -49.0714,
            latitudeDelta: 0.3,
            longitudeDelta: 0.3,
          }}
          showsUserLocation={posicao !== null}
          showsPointsOfInterests={false}
          toolbarEnabled={false}
          onPress={(e) => {
            // Toque no mapa (fora de um pino) volta para a lista completa.
            if (e.nativeEvent.action !== 'marker-press') setSelecionado(null);
          }}
        >
          {pontos.map((p) => (
            <Marker
              key={`${p.chave}:${p.chave === selecionado}`}
              identifier={p.chave}
              coordinate={{ latitude: p.local.latitude, longitude: p.local.longitude }}
              onPress={() => setSelecionado(p.chave)}
              tracksViewChanges={false}
              accessibilityLabel={`${p.local.nome ?? TIPO_LOCAL[p.local.tipo]}: ${p.produtores.map((x) => x.nome).join(', ')}`}
            >
              <PinoMapa
                categoria={filtro ?? p.produtores[0]!.categorias[0]!}
                quantos={p.produtores.length}
                selecionado={p.chave === selecionado}
              />
            </Marker>
          ))}
        </MapView>
      </View>

      <FlatList
        data={estado.status === 'pronto' ? linhas : []}
        keyExtractor={(l) => l.produtor.id}
        contentContainerStyle={estilos.lista}
        contentInsetAdjustmentBehavior="never"
        ListHeaderComponent={
          estado.status === 'pronto' && todos.length > 0 ? (
            <View style={estilos.topoLista}>
              <Texto variante="secao" style={{ flex: 1 }} accessibilityRole="header">
                {tituloDaLista(ponto, filtro, linhas.length, posicao !== null)}
              </Texto>
              {ponto && (
                <Pressable
                  onPress={() => setSelecionado(null)}
                  accessibilityRole="button"
                  hitSlop={10}
                >
                  <Texto style={estilos.link}>Ver todos</Texto>
                </Pressable>
              )}
            </View>
          ) : undefined
        }
        renderItem={({ item }) => (
          <CartaoProdutor
            produtor={item.produtor}
            local={item.local}
            km={item.km}
            categoria={filtro ?? undefined}
            onPress={() =>
              router.push({ pathname: '/produtor/[id]', params: { id: item.produtor.id } })
            }
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <EstadoLista
            estado={estado.status}
            onTentarDeNovo={tentarDeNovo}
            vazio={estado.status === 'pronto' && todos.length === 0}
          />
        }
        ListFooterComponent={
          <View style={estilos.rodape}>
            <Texto variante="apoio">
              Você produz alimentos ou cosméticos naturais na região? Peça para aparecer no mapa.
            </Texto>
            <Botao
              titulo="Quero aparecer no mapa"
              variante="secundario"
              onPress={() => router.push('/quero-aparecer')}
            />
            <Texto variante="legenda">
              Produtores visitados pelo autor do app ou que pediram para aparecer e foram
              conferidos. Sua localização só é usada no aparelho, para calcular as distâncias.
            </Texto>
          </View>
        }
      />
    </Tela>
  );
}

function tituloDaLista(
  ponto: Ponto | null,
  filtro: ProducerCategory | null,
  quantos: number,
  comDistancia: boolean,
): string {
  if (ponto) return ponto.local.nome ?? TIPO_LOCAL[ponto.local.tipo];
  const de = filtro
    ? NOME_CATEGORIA[filtro]
    : `${quantos} ${quantos === 1 ? 'produtor' : 'produtores'}`;
  return comDistancia ? `${de} · mais perto primeiro` : de;
}

function EstadoLista({
  estado,
  vazio,
  onTentarDeNovo,
}: {
  estado: 'carregando' | 'erro' | 'pronto';
  vazio: boolean;
  onTentarDeNovo: () => void;
}) {
  if (estado === 'carregando') return <Texto variante="apoio">Carregando os produtores…</Texto>;
  if (estado === 'erro') {
    return (
      <View style={estilos.linhaErro}>
        <Texto variante="apoio" style={{ flex: 1 }}>
          Não deu para carregar os produtores agora.
        </Texto>
        <Pressable onPress={onTentarDeNovo} accessibilityRole="button" hitSlop={10}>
          <Texto style={estilos.link}>Tentar de novo</Texto>
        </Pressable>
      </View>
    );
  }
  return vazio ? <Texto variante="apoio">Ainda não há produtores no mapa.</Texto> : null;
}

const estilos = StyleSheet.create({
  mapa: {
    marginHorizontal: espaco.margemTela,
    borderWidth: espaco.borda,
    borderColor: cores.tinta,
    overflow: 'hidden',
  },
  lista: { padding: espaco.margemTela, paddingTop: 18, gap: 0 },
  topoLista: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  rodape: { gap: 12, marginTop: 28 },
  linhaErro: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  link: { fontFamily: fontes.textoNegrito, fontSize: 14, textDecorationLine: 'underline' },
});
