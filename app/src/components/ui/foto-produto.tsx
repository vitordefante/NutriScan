import { Image } from 'expo-image';
import { useState } from 'react';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { cores } from '@/theme/tokens';

import { IconePixel, type NomeIconePixel } from './icone-pixel';

type Props = {
  url?: string;
  /** Ícone da categoria: aparece sem foto e enquanto a foto carrega (a do OFF demora). */
  icone: NomeIconePixel;
  /** Tamanho de cada pixel do ícone (2 = 24 pt para uma grade de 12). */
  escala?: number;
  rotuloAcessivel?: string;
  /** Tamanho e borda do quadrado. */
  style?: StyleProp<ViewStyle>;
};

/** Foto do produto num quadrado; sem ela (ou até ela chegar), o ícone pixel da categoria. */
export function FotoProduto({ url, icone, escala = 2, rotuloAcessivel, style }: Props) {
  const [carregada, setCarregada] = useState<string | null>(null);
  const comFoto = url !== undefined && carregada === url;

  return (
    <View style={[estilos.quadro, style, !comFoto && { backgroundColor: cores.vazio }]}>
      {!comFoto && <IconePixel nome={icone} escala={escala} cor={cores.cinza} />}
      {url && (
        <Image
          source={url}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
          onLoad={() => setCarregada(url)}
          {...(rotuloAcessivel && { accessibilityLabel: rotuloAcessivel })}
        />
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  quadro: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: cores.papel,
  },
});
