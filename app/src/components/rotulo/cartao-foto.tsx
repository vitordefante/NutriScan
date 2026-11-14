import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { Botao } from '@/components/ui/botao';
import { Texto } from '@/components/ui/texto';
import type { FotoLida } from '@/services/leitor-rotulo';
import { cores, espaco, fontes } from '@/theme/tokens';

type Props = {
  titulo: string;
  dica: string;
  foto: FotoLida | undefined;
  lendo: boolean;
  /** Outra parte está sendo lida: os botões ficam desabilitados. */
  ocupado: boolean;
  onFotografar: () => void;
  onGaleria: () => void;
};

/** Uma das fotos do rótulo: instrução, botões de câmera/galeria e, depois, a miniatura lida. */
export function CartaoFoto({ titulo, dica, foto, lendo, ocupado, onFotografar, onGaleria }: Props) {
  return (
    <View style={estilos.cartao}>
      <Texto variante="secao" accessibilityRole="header">
        {titulo.toLocaleUpperCase('pt-BR')}
      </Texto>

      {foto ? (
        <View style={estilos.lida}>
          <Image source={{ uri: foto.uri }} style={estilos.miniatura} contentFit="cover" />
          <View style={{ flex: 1, gap: 2 }}>
            <Texto variante="subtitulo" style={{ fontSize: 16 }}>
              Foto lida
            </Texto>
            <Texto variante="apoio">
              {foto.linhas.length} {foto.linhas.length === 1 ? 'linha' : 'linhas'} de texto
            </Texto>
          </View>
          <Pressable
            onPress={onFotografar}
            disabled={ocupado}
            accessibilityRole="button"
            accessibilityLabel={`Refazer a foto: ${titulo}`}
            hitSlop={8}
          >
            <Texto style={estilos.refazer}>Refazer</Texto>
          </Pressable>
        </View>
      ) : (
        <>
          <Texto variante="apoio">{dica}</Texto>
          {lendo ? (
            <Texto variante="pixel" style={{ fontSize: 13 }}>
              LENDO O TEXTO...
            </Texto>
          ) : (
            <View style={estilos.botoes}>
              <Botao
                titulo="Fotografar"
                icone="escanear"
                onPress={onFotografar}
                desabilitado={ocupado}
                style={{ flex: 1 }}
              />
              <Botao
                titulo="Galeria"
                variante="secundario"
                onPress={onGaleria}
                desabilitado={ocupado}
              />
            </View>
          )}
        </>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  cartao: {
    borderWidth: espaco.borda,
    borderColor: cores.tinta,
    padding: 16,
    gap: 12,
  },
  botoes: { flexDirection: 'row', gap: 12 },
  lida: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  miniatura: {
    width: 56,
    height: 56,
    borderWidth: espaco.borda,
    borderColor: cores.tinta,
  },
  refazer: { fontFamily: fontes.textoNegrito, fontSize: 15, textDecorationLine: 'underline' },
});
