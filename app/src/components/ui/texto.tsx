import { StyleSheet, Text, type TextProps } from 'react-native';

import { cores, fontes } from '@/theme/tokens';

type Variante = 'titulo' | 'subtitulo' | 'corpo' | 'apoio' | 'legenda' | 'pixel' | 'secao';

type Props = TextProps & { variante?: Variante; cor?: string };

/** Texto com as variantes tipográficas do design system (ver docs/design-system.md). */
export function Texto({ variante = 'corpo', cor, style, ...props }: Props) {
  return (
    <Text {...props} style={[estilos[variante], cor !== undefined && { color: cor }, style]} />
  );
}

const estilos = StyleSheet.create({
  titulo: {
    fontFamily: fontes.textoNegrito,
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.4,
    color: cores.tinta,
  },
  subtitulo: { fontFamily: fontes.textoNegrito, fontSize: 17, lineHeight: 22, color: cores.tinta },
  corpo: { fontFamily: fontes.texto, fontSize: 15, lineHeight: 22, color: cores.tinta },
  apoio: { fontFamily: fontes.texto, fontSize: 14, lineHeight: 20, color: cores.grafite },
  legenda: { fontFamily: fontes.texto, fontSize: 12, lineHeight: 17, color: cores.grafite },
  pixel: { fontFamily: fontes.pixel, fontSize: 12, letterSpacing: 1, color: cores.tinta },
  // 12/0.5: o título mais longo ("Nível de processamento · NOVA (USP)") cabe numa linha no iPhone 13 mini.
  secao: { fontFamily: fontes.pixel, fontSize: 12, letterSpacing: 0.5, color: cores.tinta },
});
