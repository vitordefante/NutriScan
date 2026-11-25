import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Texto } from '@/components/ui/texto';
import { fonteFotoPrivada } from '@/services/api-conta-produtor';
import { cores, espaco } from '@/theme/tokens';

type Props = {
  /** `uriLocal`: a foto recém-escolhida, mostrada do aparelho enquanto não há outra cópia. */
  foto: { id: string; uriLocal?: string } | null | undefined;
  token: string;
  tamanho: number;
};

/** Foto quadrada de um item na área do produtor (inclusive as que ainda estão em análise). */
export function FotoItem({ foto, token, tamanho }: Props) {
  const fonte = foto
    ? foto.uriLocal
      ? { uri: foto.uriLocal }
      : fonteFotoPrivada(foto.id, token)
    : null;
  return (
    <View style={[estilos.moldura, { width: tamanho, height: tamanho }]}>
      {fonte ? (
        <Image
          source={fonte}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={120}
          cachePolicy="memory-disk"
          recyclingKey={foto!.id}
        />
      ) : (
        <Texto
          variante="pixel"
          style={{
            fontSize: tamanho > 80 ? 11 : 8,
            lineHeight: tamanho > 80 ? 16 : 11,
            color: cores.cinza,
            textAlign: 'center',
          }}
        >
          {'SEM\nFOTO'}
        </Texto>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  moldura: {
    borderWidth: espaco.borda,
    borderColor: cores.tinta,
    backgroundColor: cores.vazio,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
