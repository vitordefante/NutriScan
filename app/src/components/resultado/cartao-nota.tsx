import type { ScoreBand } from '@nutriscan/shared';
import { StyleSheet, View } from 'react-native';

import { BarraHp } from '@/components/ui/barra-hp';
import { BotaoIcone } from '@/components/ui/botao';
import { Etiqueta } from '@/components/ui/etiqueta';
import { IconePixel } from '@/components/ui/icone-pixel';
import { Texto } from '@/components/ui/texto';
import { cores, espaco, faixas, fontes } from '@/theme/tokens';

type Props = {
  nota: number;
  faixa: ScoreBand;
  /** Nota parcial: é um teto (mostrada com "≤"). */
  teto: boolean;
  resumo: string;
  onPorQue: () => void;
};

/** Cartão principal: HP, nota, faixa, botão "?" e barra de HP. */
export function CartaoNota({ nota, faixa, teto, resumo, onPorQue }: Props) {
  const corFaixa = faixas[faixa];
  return (
    <View style={estilos.pilha}>
      {/* Folha de trás, deslocada: dá a sensação de cartões sobrepostos. */}
      <View style={estilos.folhaDeTras} />
      <View style={estilos.cartao}>
        {/* "?" e faixa no canto superior direito. */}
        <View style={estilos.topo}>
          <BotaoIcone rotuloAcessivel="Por que essa nota?" onPress={onPorQue} tamanho={28}>
            <Texto variante="pixel" style={{ fontSize: 13 }}>
              ?
            </Texto>
          </BotaoIcone>
          <Etiqueta texto={corFaixa.rotulo} fundo={corFaixa.preenchimento} tamanho="m" />
        </View>
        {/* ❤ HP à direita do número (numa linha só não caberiam também o "?" e a faixa). */}
        <View
          style={estilos.linhaNota}
          accessible
          accessibilityLabel={`Nota ${teto ? 'no máximo ' : ''}${nota} de 100, ${corFaixa.rotulo.toLowerCase()}`}
        >
          {/* Tudo na mesma linha de base: o ❤ HP fica na altura do "/100". */}
          <View style={estilos.numero}>
            {teto && <Texto style={[estilos.pixel, estilos.teto]}>≤</Texto>}
            <Texto style={[estilos.pixel, estilos.nota]}>{nota}</Texto>
            <Texto style={[estilos.pixel, estilos.de100]}>/100</Texto>
            <View style={estilos.hp}>
              <IconePixel nome="coracao" escala={2} cor={faixas.pessimo.preenchimento} />
              <Texto variante="pixel" style={estilos.textoHp}>
                HP
              </Texto>
            </View>
          </View>
        </View>
        <BarraHp valor={nota} cor={corFaixa.preenchimento} />
        <Texto>{resumo}</Texto>
      </View>
    </View>
  );
}

const DESLOCAMENTO = 8;

const estilos = StyleSheet.create({
  pilha: { marginRight: DESLOCAMENTO, marginBottom: DESLOCAMENTO },
  folhaDeTras: {
    position: 'absolute',
    top: DESLOCAMENTO,
    left: DESLOCAMENTO,
    right: -DESLOCAMENTO,
    bottom: -DESLOCAMENTO,
    borderWidth: espaco.borda,
    borderColor: cores.tinta,
    backgroundColor: cores.papel,
  },
  cartao: {
    borderWidth: espaco.borda,
    borderColor: cores.tinta,
    backgroundColor: cores.papel,
    padding: 20,
    paddingTop: 22,
    gap: 16,
  },
  topo: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'flex-start', gap: 6 },
  linhaNota: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: -8 },
  // Coração e "HP" com a base na mesma linha da base dos números.
  hp: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginLeft: 10 },
  textoHp: { lineHeight: 14 },
  numero: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  pixel: { fontFamily: fontes.pixel, color: cores.tinta },
  teto: { fontSize: 28, color: cores.grafite },
  nota: { fontSize: 60, lineHeight: 62 },
  de100: { fontSize: 20, color: cores.grafite },
});
