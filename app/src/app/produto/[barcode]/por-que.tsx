import { router, useLocalSearchParams } from 'expo-router';

import { EstadoCarregando, EstadoErro } from '@/components/resultado/estados';
import { PorQueNota } from '@/components/resultado/por-que-nota';
import { CabecalhoTela } from '@/components/ui/cabecalho-tela';
import { Tela } from '@/components/ui/tela';
import { useProduto } from '@/hooks/use-produto';

/** "Por que essa nota": lista os itens (pontos, motivo e fonte) que formam a nota. */
export default function TelaPorQue() {
  const { barcode } = useLocalSearchParams<{ barcode: string }>();
  // Normalmente já está na memória (a tela de resultado acabou de buscar).
  const { estado, tentarDeNovo } = useProduto(barcode);
  const analise = estado.status === 'pronto' ? estado.dados.analise : null;
  const temNota = analise !== null && analise.status !== 'dados_insuficientes';

  // Nota parcial é um teto: o título mostra "≤" como o cartão da nota final.
  const titulo = temNota
    ? `POR QUE ${analise.status === 'parcial' ? '≤' : ''}${analise.nota}?`
    : 'POR QUE ESSA NOTA?';

  return (
    <Tela>
      <CabecalhoTela titulo={titulo} onVoltar={() => router.back()} />
      {estado.status === 'carregando' && <EstadoCarregando barcode={barcode} />}
      {estado.status === 'erro' && (
        <EstadoErro
          tipo={estado.tipo}
          barcode={barcode}
          onTentarDeNovo={tentarDeNovo}
          onEscanearOutro={() => router.dismissTo('/')}
        />
      )}
      {temNota && (
        <PorQueNota
          itens={analise.itens}
          nota={analise.nota}
          faixa={analise.faixa}
          teto={analise.status === 'parcial'}
        />
      )}
    </Tela>
  );
}
