import type { ScoreBand, ScoreItem } from '@nutriscan/shared';
import { ScrollView, StyleSheet, View } from 'react-native';

import { BarraHp } from '@/components/ui/barra-hp';
import { IconePixel } from '@/components/ui/icone-pixel';
import { Texto } from '@/components/ui/texto';
import { cores, espaco, faixas, fontes } from '@/theme/tokens';

type Props = {
  itens: ScoreItem[];
  nota: number;
  faixa: ScoreBand;
  /** Nota parcial: é um teto (mostrada com "≤"). */
  teto: boolean;
};

/** Lista dos itens que compõem a nota (100 HP → descontos → nota final). */
export function PorQueNota({ itens, nota, faixa, teto }: Props) {
  return (
    <ScrollView contentContainerStyle={estilos.conteudo} contentInsetAdjustmentBehavior="never">
      <Texto>
        Todo produto começa com <Texto style={{ fontFamily: fontes.textoNegrito }}>100 HP</Texto>.
        Cada item abaixo desconta (ou soma) pontos, sempre com a fonte que justifica a regra.
      </Texto>

      <View style={{ gap: 8 }}>
        <View style={estilos.hp}>
          <IconePixel nome="coracao" cor={faixas.pessimo.preenchimento} />
          <Texto variante="pixel">HP</Texto>
          <Texto variante="pixel">100/100</Texto>
        </View>
        <BarraHp valor={100} cor={faixas.excelente.preenchimento} />
      </View>

      {itens.map((item) => (
        <View key={item.id} style={estilos.item}>
          <View style={estilos.topoItem}>
            <Texto variante="subtitulo" style={{ flex: 1, fontSize: 16 }}>
              {item.label}
            </Texto>
            <View
              style={[
                estilos.pontos,
                { backgroundColor: item.pontos < 0 ? cores.coral : faixas.excelente.preenchimento },
              ]}
            >
              <Texto variante="pixel" style={{ fontSize: 14 }}>
                {formatarPontos(item.pontos)}
              </Texto>
            </View>
          </View>
          <Texto style={{ fontSize: 14, lineHeight: 20 }}>
            {item.motivo}
            {item.estimado ? ' (estimado)' : ''}
          </Texto>
          <View style={estilos.fonte}>
            <Texto variante="pixel" cor={cores.grafite} style={{ fontSize: 10 }}>
              FONTE
            </Texto>
            <Texto variante="legenda">{item.fonte}</Texto>
          </View>
        </View>
      ))}

      <NotaFinal nota={nota} faixa={faixa} teto={teto} />
    </ScrollView>
  );
}

/** Fechamento da conta: a nota depois de todos os descontos (cartão escuro, folha deslocada). */
function NotaFinal({ nota, faixa, teto }: Omit<Props, 'itens'>) {
  return (
    <View style={estilos.pilhaFinal}>
      <View style={estilos.folhaDeTras} />
      <View
        style={estilos.final}
        accessible
        accessibilityLabel={`Nota final: ${teto ? 'no máximo ' : ''}${nota} de 100`}
      >
        <View style={estilos.topoFinal}>
          <Texto variante="pixel" cor={cores.papel}>
            NOTA FINAL
          </Texto>
          <Texto variante="pixel" cor={cores.papel} style={{ fontSize: 26 }}>
            {teto ? '≤' : ''}
            {nota}
            <Texto variante="pixel" cor={cores.textoSobreTinta} style={{ fontSize: 13 }}>
              /100
            </Texto>
          </Texto>
        </View>
        <BarraHp valor={nota} cor={faixas[faixa].preenchimento} altura={12} escura />
      </View>
    </View>
  );
}

/** −45 / +5 (com o sinal de menos tipográfico). */
function formatarPontos(pontos: number): string {
  return pontos < 0 ? `−${Math.abs(pontos)}` : `+${pontos}`;
}

const estilos = StyleSheet.create({
  conteudo: {
    paddingHorizontal: espaco.margemTela,
    paddingTop: 8,
    paddingBottom: 48,
    gap: 16,
  },
  hp: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  item: {
    borderWidth: espaco.borda,
    borderColor: cores.tinta,
    backgroundColor: cores.papel,
    padding: 16,
    gap: 10,
  },
  topoItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  pilhaFinal: { marginTop: 4, marginRight: 8, marginBottom: 8 },
  folhaDeTras: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: -8,
    bottom: -8,
    borderWidth: espaco.borda,
    borderColor: cores.tinta,
    backgroundColor: cores.papel,
  },
  final: {
    borderWidth: espaco.borda,
    borderColor: cores.tinta,
    backgroundColor: cores.tinta,
    padding: 16,
    gap: 12,
  },
  topoFinal: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pontos: {
    borderWidth: espaco.borda,
    borderColor: cores.tinta,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  fonte: {
    gap: 2,
    // Linha fina sólida: no iOS, borda pontilhada em um lado só não é desenhada.
    borderTopWidth: 1,
    borderTopColor: cores.linhaPontilhada,
    paddingTop: 10,
  },
});
