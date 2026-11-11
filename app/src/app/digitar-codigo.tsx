import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Botao } from '@/components/ui/botao';
import { Texto } from '@/components/ui/texto';
import { normalizarCodigo } from '@/lib/codigo-barras';
import { cores, espaco, faixas, fontes } from '@/theme/tokens';

/** Folha para digitar o código de barras (câmera sem foco, etiqueta amassada, simulador). */
export default function TelaDigitarCodigo() {
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState(false);

  function analisar() {
    const barcode = normalizarCodigo(texto);
    if (!barcode) {
      setErro(true);
      return;
    }
    // Substitui a folha pela tela de resultado (voltar leva direto ao scanner).
    router.replace({ pathname: '/produto/[barcode]', params: { barcode } });
  }

  return (
    <View style={estilos.folha}>
      <Texto variante="pixel" style={{ fontSize: 16 }} accessibilityRole="header">
        DIGITAR CÓDIGO
      </Texto>
      <View style={{ gap: 8 }}>
        <Texto variante="apoio" nativeID="rotulo-codigo">
          Os números abaixo das barras (8 a 14 dígitos).
        </Texto>
        <TextInput
          value={texto}
          onChangeText={(t) => {
            setTexto(t);
            setErro(false);
          }}
          onSubmitEditing={analisar}
          keyboardType="number-pad"
          returnKeyType="search"
          autoFocus
          maxLength={18}
          placeholder="7891000241356"
          placeholderTextColor={cores.cinza}
          accessibilityLabelledBy="rotulo-codigo"
          style={[estilos.campo, erro && { borderColor: cores.coral }]}
        />
        {erro && (
          <Texto variante="legenda" cor={faixas.pessimo.texto}>
            Confira o código: precisa ter de 8 a 14 dígitos.
          </Texto>
        )}
      </View>
      <Botao titulo="Analisar" onPress={analisar} />
    </View>
  );
}

const estilos = StyleSheet.create({
  folha: {
    flex: 1,
    padding: espaco.margemTela,
    paddingTop: 28,
    gap: 20,
    backgroundColor: cores.papel,
  },
  campo: {
    height: 56,
    borderWidth: espaco.borda,
    borderColor: cores.tinta,
    paddingHorizontal: 16,
    fontFamily: fontes.textoMedio,
    fontSize: 20,
    letterSpacing: 1,
    color: cores.tinta,
  },
});
