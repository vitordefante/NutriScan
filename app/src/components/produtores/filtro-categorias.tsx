import type { ProducerCategory } from '@nutriscan/shared';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { IconePixel } from '@/components/ui/icone-pixel';
import { Texto } from '@/components/ui/texto';
import { ROTULO_CATEGORIA } from '@/lib/categorias-produtor';
import { cores, espaco } from '@/theme/tokens';

type Props = {
  /** Só as categorias que existem no mapa. */
  categorias: readonly ProducerCategory[];
  valor: ProducerCategory | null;
  onMudar: (c: ProducerCategory | null) => void;
};

/** Filtro do mapa: "Todos" + uma opção por categoria, numa linha que rola para o lado. */
export function FiltroCategorias({ categorias, valor, onMudar }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      // Sem isto, a lista abaixo (flex: 1) espreme a linha e corta os botões.
      style={{ flexGrow: 0, flexShrink: 0 }}
      contentContainerStyle={estilos.linha}
      accessibilityRole="tablist"
      accessibilityLabel="Filtrar por categoria"
    >
      <Opcao rotulo="Todos" ativa={valor === null} onPress={() => onMudar(null)} />
      {categorias.map((c) => (
        <Opcao
          key={c}
          rotulo={ROTULO_CATEGORIA[c]}
          categoria={c}
          ativa={valor === c}
          onPress={() => onMudar(valor === c ? null : c)}
        />
      ))}
    </ScrollView>
  );
}

function Opcao({
  rotulo,
  categoria,
  ativa,
  onPress,
}: {
  rotulo: string;
  categoria?: ProducerCategory;
  ativa: boolean;
  onPress: () => void;
}) {
  const cor = ativa ? cores.papel : cores.tinta;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: ativa }}
      accessibilityLabel={rotulo}
      style={[estilos.opcao, { backgroundColor: ativa ? cores.tinta : cores.papel }]}
    >
      {categoria && <IconePixel nome={categoria} escala={1} cor={cor} />}
      <Texto variante="pixel" cor={cor} style={{ fontSize: 10 }}>
        {rotulo.toLocaleUpperCase('pt-BR')}
      </Texto>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  linha: { gap: 8, paddingHorizontal: espaco.margemTela, paddingVertical: 10 },
  opcao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: 10,
    borderWidth: espaco.borda,
    borderColor: cores.tinta,
  },
});
