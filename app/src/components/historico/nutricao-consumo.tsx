import type { DailyNutrition } from '@nutriscan/shared';
import { StyleSheet, View } from 'react-native';

import { LinhaMicro, PainelMacros } from '@/components/resultado/nutricao';
import { CartaoEmPilha } from '@/components/ui/cartao-em-pilha';
import { Texto } from '@/components/ui/texto';

/**
 * Média por dia do que foi registrado: anel de energia, macros e vitaminas/minerais com %VD.
 * Só conta o que a pessoa registrou, e só alimentos com tabela nutricional.
 */
export function NutricaoConsumo({ nutricao: n }: { nutricao: DailyNutrition }) {
  const estimados = n.micros.some((m) => m.estimado);
  return (
    <CartaoEmPilha style={estilos.cartao}>
      <View style={{ gap: 4 }}>
        <Texto variante="pixel" style={{ fontSize: 11 }}>
          NUTRIÇÃO · MÉDIA POR DIA
        </Texto>
        <Texto variante="apoio">
          {n.registros} {n.registros === 1 ? 'registro' : 'registros'} com tabela em{' '}
          {n.diasComRegistro} {n.diasComRegistro === 1 ? 'dia' : 'dias'}. Só entra o que você
          registrou.
        </Texto>
      </View>

      <PainelMacros macros={n.porDia} fator={1} rotulo="dia" tamanho={120} />

      {n.micros.length > 0 && (
        <View style={estilos.micros}>
          <Texto variante="subtitulo">Vitaminas e minerais</Texto>
          {n.micros.map((m) => (
            <LinhaMicro key={m.id} micro={m} fator={1} estimado={m.estimado} />
          ))}
        </View>
      )}

      <Texto variante="legenda">
        {estimados
          ? '≈ e barra cinza: inclui a estimativa pela TACO (UNICAMP) para alimentos simples. '
          : ''}
        A maioria dos rótulos não declara vitaminas e minerais, então o total real tende a ser
        maior. %VD: valor diário de referência para adultos (ANVISA, IN 75/2020).
      </Texto>
    </CartaoEmPilha>
  );
}

const estilos = StyleSheet.create({
  cartao: { padding: 18, gap: 16 },
  micros: { gap: 12 },
});
