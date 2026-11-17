import { Pressable, StyleSheet, View } from 'react-native';

import { cores, espaco } from '@/theme/tokens';

import { Texto } from './texto';

type Opcao<T extends string> = { valor: T; rotulo: string };

type Props<T extends string> = {
  opcoes: readonly Opcao<T>[];
  valor: T;
  onMudar: (valor: T) => void;
  /** Descrição para o leitor de tela (ex.: "Período"). */
  rotuloAcessivel: string;
};

/** Seletor segmentado: a opção escolhida fica cheia (tinta), as outras só com a borda. */
export function Seletor<T extends string>({ opcoes, valor, onMudar, rotuloAcessivel }: Props<T>) {
  return (
    <View style={estilos.grupo} accessibilityRole="tablist" accessibilityLabel={rotuloAcessivel}>
      {opcoes.map((o, i) => {
        const ativa = o.valor === valor;
        return (
          <Pressable
            key={o.valor}
            onPress={() => onMudar(o.valor)}
            accessibilityRole="tab"
            accessibilityState={{ selected: ativa }}
            style={[
              estilos.opcao,
              i > 0 && estilos.depois,
              { backgroundColor: ativa ? cores.tinta : cores.papel },
            ]}
          >
            <Texto variante="pixel" cor={ativa ? cores.papel : cores.tinta} style={estilos.texto}>
              {o.rotulo.toLocaleUpperCase('pt-BR')}
            </Texto>
          </Pressable>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: { flexDirection: 'row', borderWidth: espaco.borda, borderColor: cores.tinta },
  opcao: { flex: 1, height: 40, alignItems: 'center', justifyContent: 'center' },
  depois: { borderLeftWidth: espaco.borda, borderLeftColor: cores.tinta },
  texto: { fontSize: 11 },
});
