import type { Product } from '@nutriscan/shared';
import { StyleSheet, View } from 'react-native';

import { Etiqueta } from '@/components/ui/etiqueta';
import { FotoProduto } from '@/components/ui/foto-produto';
import { Texto } from '@/components/ui/texto';
import { iconeDoProduto } from '@/lib/icone-produto';
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
        <FotoProduto
          url={produto.imagemUrl}
          icone={iconeDoProduto(produto.tipo, produto.categorias)}
          escala={3}
          rotuloAcessivel={`Foto de ${produto.nome}`}
          style={estilos.foto}
        />
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
  },
  textos: { flex: 1, gap: 6 },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
