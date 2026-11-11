import { router, useLocalSearchParams } from 'expo-router';

import { EstadoCarregando, EstadoErro } from '@/components/resultado/estados';
import { ResultadoProduto } from '@/components/resultado/resultado-produto';
import { CabecalhoTela } from '@/components/ui/cabecalho-tela';
import { Tela } from '@/components/ui/tela';
import { useProduto } from '@/hooks/use-produto';

/** Tela de resultado: busca o produto pelo código e mostra a análise (ou o estado de erro). */
export default function TelaResultado() {
  const { barcode } = useLocalSearchParams<{ barcode: string }>();
  const { estado, tentarDeNovo } = useProduto(barcode);

  return (
    <Tela>
      <CabecalhoTela titulo="RESULTADO" onVoltar={() => router.back()} />
      {estado.status === 'carregando' && <EstadoCarregando barcode={barcode} />}
      {estado.status === 'erro' && (
        <EstadoErro
          tipo={estado.tipo}
          barcode={barcode}
          onTentarDeNovo={tentarDeNovo}
          onEscanearOutro={() => router.back()}
        />
      )}
      {estado.status === 'pronto' && (
        <ResultadoProduto
          dados={estado.dados}
          onPorQue={() =>
            router.push({ pathname: '/produto/[barcode]/por-que', params: { barcode } })
          }
        />
      )}
    </Tela>
  );
}
