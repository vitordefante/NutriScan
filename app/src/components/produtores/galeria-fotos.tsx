import type { ProducerPhoto } from '@nutriscan/shared';
import { Image } from 'expo-image';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Texto } from '@/components/ui/texto';
import { urlFotoProdutor } from '@/services/api-produtores';
import { cores, espaco } from '@/theme/tokens';

import { VisualizadorFotos } from './visualizador-fotos';

type Props = { fotos: readonly ProducerPhoto[]; nomeProdutor: string };

/** Fotos do produtor: carrossel 4:3 (deslizar para o lado) e toque para ver em tela cheia. */
export function GaleriaFotos({ fotos, nomeProdutor }: Props) {
  const { width } = useWindowDimensions();
  const interna = width - espaco.margemTela * 2 - espaco.borda * 2;
  const altura = Math.round(interna * 0.75);
  const [atual, setAtual] = useState(0);
  const [aberta, setAberta] = useState<number | null>(null);

  // Sem fotos, ou build sem o endereço da API: a tela segue sem a galeria.
  if (fotos.length === 0 || urlFotoProdutor(fotos[0]!.id) === null) return null;

  return (
    <View>
      <View style={estilos.moldura}>
        <FlatList
          data={fotos}
          keyExtractor={(f) => f.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          getItemLayout={(_, i) => ({ length: interna, offset: interna * i, index: i })}
          onMomentumScrollEnd={(e) => setAtual(Math.round(e.nativeEvent.contentOffset.x / interna))}
          renderItem={({ item, index }) => (
            <Pressable
              onPress={() => setAberta(index)}
              accessibilityRole="imagebutton"
              accessibilityLabel={`${item.legenda ?? `Foto de ${nomeProdutor}`}. Foto ${index + 1} de ${fotos.length}. Toque para ampliar.`}
            >
              <Image
                source={urlFotoProdutor(item.id)}
                style={{ width: interna, height: altura, backgroundColor: cores.vazio }}
                contentFit="cover"
                transition={150}
                cachePolicy="memory-disk"
                recyclingKey={item.id}
              />
            </Pressable>
          )}
        />
        {fotos.length > 1 && (
          <View style={estilos.contador} pointerEvents="none">
            <Texto variante="pixel" style={{ fontSize: 10 }}>
              {atual + 1}/{fotos.length}
            </Texto>
          </View>
        )}
      </View>
      {aberta !== null && (
        <VisualizadorFotos
          fotos={fotos}
          inicial={aberta}
          onFechar={(ultima) => {
            setAberta(null);
            setAtual(ultima);
          }}
        />
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  moldura: { borderWidth: espaco.borda, borderColor: cores.tinta, backgroundColor: cores.vazio },
  contador: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: cores.papel,
    borderWidth: espaco.borda,
    borderColor: cores.tinta,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
});
