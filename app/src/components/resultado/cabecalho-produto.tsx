import type { Product } from '@nutriscan/shared';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Etiqueta } from '@/components/ui/etiqueta';
import { Texto } from '@/components/ui/texto';
import { cores, espaco } from '@/theme/tokens';

const TIPO: Record<Product['tipo'], string> = { alimento: 'Alimento', cosmetico: 'Cosmético' };

/** Foto, etiquetas (tipo e subtipo), nome, marca e código de barras. */
export function CabecalhoProduto({ produto }: { produto: Product }) {
  return (
    <View style={estilos.bloco}>
      {/* Etiquetas na largura toda: ao lado da foto, "Biscoito recheado" não cabia e quebrava. */}
      <View style={estilos.etiquetas}>
        <Etiqueta texto={TIPO[produto.tipo]} />
        {produto.subtipo && <Etiqueta texto={produto.subtipo} />}
      </View>
      <View style={estilos.linha}>
        <View style={estilos.foto}>
          {produto.imagemUrl ? (
            <Image
              source={produto.imagemUrl}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              accessibilityLabel={`Foto de ${produto.nome}`}
            />
          ) : (
            <Texto variante="pixel" cor={cores.cinza} style={estilos.semFoto}>
              SEM{'\n'}FOTO
            </Texto>
          )}
        </View>
        <View style={estilos.textos}>
          <Texto variante="titulo" numberOfLines={3}>
            {produto.nome}
          </Texto>
          <Texto variante="apoio">
            {[produto.marca, produto.barcode].filter(Boolean).join(' · ')}
          </Texto>
        </View>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  bloco: { gap: 14 },
  linha: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  foto: {
    width: 84,
    height: 84,
    borderWidth: espaco.borda,
    borderColor: cores.tinta,
    backgroundColor: cores.papel,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  semFoto: { fontSize: 9, textAlign: 'center' },
  textos: { flex: 1, gap: 6 },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
