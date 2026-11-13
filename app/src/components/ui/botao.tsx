import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { cores, espaco, fontes } from '@/theme/tokens';

import { IconePixel, type NomeIconePixel } from './icone-pixel';
import { Texto } from './texto';

type Props = {
  titulo: string;
  onPress: () => void;
  variante?: 'primario' | 'secundario';
  icone?: NomeIconePixel;
  desabilitado?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Botão com sombra sólida deslocada (neo-brutalista). Ao tocar, a face desce até a sombra,
 * dando a sensação de "apertar" a peça.
 */
export function Botao({
  titulo,
  onPress,
  variante = 'primario',
  icone,
  desabilitado,
  style,
}: Props) {
  const primario = variante === 'primario';
  const corTexto = primario ? cores.papel : cores.tinta;
  return (
    <ComSombra
      deslocamento={espaco.sombraBotao}
      onPress={onPress}
      desabilitado={desabilitado}
      rotuloAcessivel={titulo}
      style={style}
    >
      <View style={[estilos.face, { backgroundColor: primario ? cores.tinta : cores.papel }]}>
        {icone && <IconePixel nome={icone} cor={corTexto} />}
        <Texto style={[estilos.titulo, { color: corTexto }]}>{titulo}</Texto>
      </View>
    </ComSombra>
  );
}

type PropsBotaoIcone = {
  rotuloAcessivel: string;
  onPress: () => void;
  tamanho?: number;
  children: ReactNode;
};

/** Botão quadrado pequeno (ex.: "?" e lanterna), com sombra preta de 3 px. */
export function BotaoIcone({ rotuloAcessivel, onPress, tamanho = 40, children }: PropsBotaoIcone) {
  return (
    <ComSombra
      deslocamento={espaco.sombraBotaoPequeno}
      onPress={onPress}
      rotuloAcessivel={rotuloAcessivel}
      // O desenho é pequeno, mas a área de toque chega aos 44 pt recomendados.
      hitSlop={Math.max(0, (44 - tamanho) / 2) + 4}
    >
      <View style={[estilos.faceIcone, { width: tamanho, height: tamanho }]}>{children}</View>
    </ComSombra>
  );
}

type PropsSombra = {
  deslocamento: number;
  onPress: () => void;
  rotuloAcessivel: string;
  desabilitado?: boolean;
  hitSlop?: number;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

function ComSombra({
  deslocamento,
  onPress,
  rotuloAcessivel,
  desabilitado,
  hitSlop,
  style,
  children,
}: PropsSombra) {
  return (
    <Pressable
      onPress={onPress}
      disabled={desabilitado}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={rotuloAcessivel}
      accessibilityState={{ disabled: desabilitado }}
      style={[{ paddingRight: deslocamento, paddingBottom: deslocamento }, style]}
    >
      {({ pressed }) => (
        <>
          <View
            style={[
              estilos.sombra,
              { left: deslocamento, top: deslocamento },
              pressed && estilos.oculta,
            ]}
          />
          <View
            style={[
              desabilitado && estilos.desabilitado,
              pressed && {
                transform: [{ translateX: deslocamento }, { translateY: deslocamento }],
              },
            ]}
          >
            {children}
          </View>
        </>
      )}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  sombra: { position: 'absolute', right: 0, bottom: 0, backgroundColor: cores.tinta },
  oculta: { opacity: 0 },
  desabilitado: { opacity: 0.5 },
  face: {
    height: 52,
    paddingHorizontal: 20,
    borderWidth: espaco.borda,
    borderColor: cores.tinta,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  titulo: { fontFamily: fontes.textoNegrito, fontSize: 16 },
  faceIcone: {
    borderWidth: espaco.borda,
    borderColor: cores.tinta,
    backgroundColor: cores.papel,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
