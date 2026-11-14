import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native';

import { cores, espaco, fontes } from '@/theme/tokens';

import { Texto } from './texto';

type Props = TextInputProps & { rotulo: string };

/** Campo de texto com rótulo em cima (borda tinta, cantos retos, como os botões). */
export function CampoTexto({ rotulo, style, ...props }: Props) {
  return (
    <View style={estilos.bloco}>
      <Texto variante="apoio" style={estilos.rotulo}>
        {rotulo}
      </Texto>
      <TextInput
        placeholderTextColor={cores.cinza}
        accessibilityLabel={rotulo}
        {...props}
        style={[estilos.campo, style]}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  bloco: { gap: 6 },
  rotulo: { fontFamily: fontes.textoMedio, color: cores.tinta },
  campo: {
    height: 52,
    borderWidth: espaco.borda,
    borderColor: cores.tinta,
    backgroundColor: cores.papel,
    paddingHorizontal: 14,
    fontFamily: fontes.textoMedio,
    fontSize: 17,
    color: cores.tinta,
  },
});
