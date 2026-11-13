import type { ProductResult } from '@nutriscan/shared';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Texto } from '@/components/ui/texto';
import { resumoDosAlertasCosmetico, resumoDosDestaques } from '@/lib/resumo-analise';
import { espaco } from '@/theme/tokens';

import { CabecalhoProduto } from './cabecalho-produto';
import { CartaoNota } from './cartao-nota';
import { AvisoFaltando } from './estados';
import { CartaoAlerta, CartaoNova, EscalaNutriScore, LupaAnvisa, Secao } from './secoes';

type Props = { dados: ProductResult; onPorQue: () => void };

/** Conteúdo da tela de resultado (produto + análise), já com os dados carregados. */
export function ResultadoProduto({ dados, onPorQue }: Props) {
  const { produto, analise } = dados;
  // Cosméticos não têm NOVA, Nutri-Score nem lupa: a nota vem só dos ingredientes de atenção,
  // que chegam como alertas (do nível alto para o baixo).
  const cosmetico = produto.tipo === 'cosmetico';
  const resumo =
    analise.status === 'dados_insuficientes'
      ? ''
      : cosmetico
        ? resumoDosAlertasCosmetico(analise.alertas, analise.status === 'completa')
        : resumoDosDestaques(analise.destaques, analise.status === 'completa');

  return (
    // "never": a área segura já é tratada pelo componente Tela; o ajuste automático do iOS somava de novo.
    <ScrollView contentContainerStyle={estilos.conteudo} contentInsetAdjustmentBehavior="never">
      <CabecalhoProduto produto={produto} />

      {analise.status === 'dados_insuficientes' ? (
        <AvisoFaltando
          faltando={analise.faltando}
          texto="Sem esses dados não dá para calcular uma nota honesta para este produto."
        />
      ) : (
        <>
          <CartaoNota
            nota={analise.nota}
            faixa={analise.faixa}
            teto={analise.status === 'parcial'}
            resumo={resumo}
            onPorQue={onPorQue}
          />

          {analise.destaques.lupa.length > 0 && (
            <Secao titulo="Rótulo frontal · ANVISA">
              <LupaAnvisa avisos={analise.destaques.lupa} />
            </Secao>
          )}
          {analise.destaques.nova && (
            <Secao titulo="Nível de processamento · NOVA (USP)">
              <CartaoNova nova={analise.destaques.nova} />
            </Secao>
          )}
          {analise.destaques.nutriScore && (
            <Secao titulo="Qualidade nutricional · Nutri-Score">
              <EscalaNutriScore letra={analise.destaques.nutriScore.letra} />
            </Secao>
          )}
        </>
      )}

      {analise.alertas.length > 0 && (
        <Secao
          titulo={`${cosmetico ? 'Ingredientes de atenção' : 'Alertas'} · ${analise.alertas.length}`}
        >
          <View style={{ gap: 10 }}>
            {analise.alertas.map((alerta) => (
              <CartaoAlerta key={alerta.id} alerta={alerta} />
            ))}
          </View>
        </Secao>
      )}

      {/* Primeiro os fatos encontrados; o que faltou fica no fim, para quem rolar até aqui. */}
      {analise.status === 'parcial' && (
        <AvisoFaltando
          faltando={analise.faltando}
          texto="Com os dados completos, a nota só poderia ficar igual ou menor."
        />
      )}

      <Texto variante="legenda" style={estilos.rodape}>
        Dados do produto: {cosmetico ? 'Open Beauty Facts' : 'Open Food Facts'}.{'\n'}
        Metodologia da nota: NutriScan v1{cosmetico ? ' (cosméticos)' : ''}.
        {dados.desatualizado ? '\nA base estava fora do ar: dados de uma consulta anterior.' : ''}
      </Texto>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  conteudo: {
    paddingHorizontal: espaco.margemTela,
    paddingTop: 8,
    paddingBottom: 48,
    gap: 28,
  },
  rodape: { textAlign: 'center' },
});
