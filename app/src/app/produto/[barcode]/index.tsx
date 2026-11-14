import { router, useLocalSearchParams } from 'expo-router';

import { SecaoAlternativas } from '@/components/resultado/alternativas';
import { EstadoCarregando, EstadoErro } from '@/components/resultado/estados';
import { ResultadoProduto } from '@/components/resultado/resultado-produto';
import { CabecalhoTela } from '@/components/ui/cabecalho-tela';
import { Tela } from '@/components/ui/tela';
import { useAlternativas } from '@/hooks/use-alternativas';
import { useProduto } from '@/hooks/use-produto';
import { podeLerRotulo } from '@/services/leitor-rotulo';

/** Tela de resultado: busca o produto pelo código e mostra a análise (ou o estado de erro). */
export default function TelaResultado() {
  const { barcode } = useLocalSearchParams<{ barcode: string }>();
  const { estado, tentarDeNovo } = useProduto(barcode);
  const produto = estado.status === 'pronto' ? estado.dados.produto : undefined;
  const analise = estado.status === 'pronto' ? estado.dados.analise : undefined;
  const alternativas = useAlternativas(
    barcode,
    analise && analise.status !== 'dados_insuficientes' ? analise.nota : null,
    produto !== undefined,
  );

  // Sem cadastro (ou cadastro sem nome), a tela da foto também pede o nome do produto.
  const fotografar = podeLerRotulo
    ? () =>
        router.push({
          pathname: '/produto/[barcode]/rotulo',
          params: {
            barcode,
            ...(produto && { tipo: produto.tipo }),
            ...((!produto || produto.nome === 'Produto sem nome') && { novo: '1' }),
          },
        })
    : undefined;

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
          onFotografar={fotografar}
        />
      )}
      {estado.status === 'pronto' && (
        <ResultadoProduto
          dados={estado.dados}
          onPorQue={() =>
            router.push({ pathname: '/produto/[barcode]/por-que', params: { barcode } })
          }
          onCompletarComFoto={fotografar}
          alternativas={
            <SecaoAlternativas
              estado={alternativas.estado}
              tipo={estado.dados.produto.tipo}
              onAbrir={(outro) =>
                router.push({ pathname: '/produto/[barcode]', params: { barcode: outro } })
              }
              onTentarDeNovo={alternativas.tentarDeNovo}
            />
          }
        />
      )}
    </Tela>
  );
}
