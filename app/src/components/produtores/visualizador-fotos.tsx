import type { ProducerPhoto } from '@nutriscan/shared';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
// Dentro de um Modal a área segura nativa (a da Tela) não se aplica: o Modal precisa do próprio
// provider para medir o notch e a barra de baixo.
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { Texto } from '@/components/ui/texto';
import { urlFotoProdutor } from '@/services/api-produtores';
import { cores, espaco } from '@/theme/tokens';

type Props = {
  fotos: readonly ProducerPhoto[];
  inicial: number;
  /** Recebe a foto em que o usuário parou, para o carrossel acompanhar. */
  onFechar: (ultima: number) => void;
};

/** Fotos em tela cheia: deslizar para o lado e, no iPhone, pinça para ampliar. */
export function VisualizadorFotos({ fotos, inicial, onFechar }: Props) {
  const { width } = useWindowDimensions();
  const [atual, setAtual] = useState(inicial);
  const fechar = () => onFechar(atual);

  return (
    <Modal visible animationType="fade" onRequestClose={fechar} statusBarTranslucent>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <SafeAreaView edges={['top', 'bottom']} style={estilos.fundo}>
          <View style={estilos.topo}>
            <Texto variante="pixel" style={estilos.contador}>
              {fotos.length > 1 ? `${atual + 1}/${fotos.length}` : ''}
            </Texto>
            <Pressable
              onPress={fechar}
              accessibilityRole="button"
              accessibilityLabel="Fechar fotos"
              hitSlop={12}
              style={({ pressed }) => [estilos.fechar, pressed && { opacity: 0.6 }]}
            >
              <Texto variante="pixel" style={{ color: cores.papel, fontSize: 12 }}>
                FECHAR
              </Texto>
            </Pressable>
          </View>

          <FlatList
            data={fotos}
            keyExtractor={(f) => f.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={inicial}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            onMomentumScrollEnd={(e) => setAtual(Math.round(e.nativeEvent.contentOffset.x / width))}
            style={{ flex: 1 }}
            renderItem={({ item, index }) => (
              // ScrollView com zoom: a pinça nativa do iOS (no Android a foto fica sem zoom).
              <ScrollView
                style={{ width }}
                contentContainerStyle={{ flexGrow: 1 }}
                maximumZoomScale={3}
                minimumZoomScale={1}
                centerContent
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
              >
                <Image
                  source={urlFotoProdutor(item.id)}
                  style={{ flex: 1, width }}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                  accessibilityLabel={item.legenda ?? `Foto ${index + 1} de ${fotos.length}`}
                />
              </ScrollView>
            )}
          />
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: cores.tinta },
  topo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: espaco.margemTela,
    paddingVertical: 12,
  },
  contador: { color: cores.textoSobreTinta, fontSize: 12 },
  fechar: {
    borderWidth: espaco.borda,
    borderColor: cores.papel,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});
