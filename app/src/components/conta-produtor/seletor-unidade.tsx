import type { PriceUnit } from '@nutriscan/shared';
import { Pressable, StyleSheet, View } from 'react-native';

import { Texto } from '@/components/ui/texto';
import { UNIDADES } from '@/lib/preco';
import { cores, espaco } from '@/theme/tokens';

type Props = { valor: PriceUnit | null; onMudar: (u: PriceUnit) => void };

/** Unidade do preço: lista fechada (os preços do mapa ficam no mesmo padrão). */
export function SeletorUnidade({ valor, onMudar }: Props) {
  return (
    <View style={estilos.grade} accessibilityRole="radiogroup" accessibilityLabel="Unidade">
      {UNIDADES.map((u) => {
        const ativa = u.valor === valor;
        return (
          <Pressable
            key={u.valor}
            onPress={() => onMudar(u.valor)}
            accessibilityRole="radio"
            accessibilityState={{ selected: ativa }}
            accessibilityLabel={`por ${u.rotulo}`}
            hitSlop={4}
            style={[estilos.opcao, ativa && { backgroundColor: cores.tinta }]}
          >
            <Texto
              variante="pixel"
              style={{ fontSize: 10, color: ativa ? cores.papel : cores.tinta }}
            >
              {u.rotulo.toLocaleUpperCase('pt-BR')}
            </Texto>
          </Pressable>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  opcao: {
    borderWidth: espaco.borda,
    borderColor: cores.tinta,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
});
