import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { SecaoAlternativas } from '@/components/resultado/alternativas';
import { EstadoCarregando, EstadoErro } from '@/components/resultado/estados';
import { SecaoProdutoresLocais } from '@/components/resultado/produtores-locais';
import { RegistrarConsumo } from '@/components/resultado/registrar-consumo';
import { ResultadoProduto } from '@/components/resultado/resultado-produto';
import { CabecalhoTela } from '@/components/ui/cabecalho-tela';
import { Tela } from '@/components/ui/tela';
import { useAlternativas } from '@/hooks/use-alternativas';
import { useProduto } from '@/hooks/use-produto';
import { useProdutoresDoProduto } from '@/hooks/use-produtores';
import { guardarScan, itemDoResultado } from '@/lib/historico-local';
import { iconeDoProduto } from '@/lib/icone-produto';
import { enviarPendentes } from '@/lib/sincronizacao';
import { podeLerRotulo } from '@/services/leitor-rotulo';

/** Tela de resultado: busca o produto pelo código e mostra a análise (ou o estado de erro). */
export default function TelaResultado() {
  const { barcode } = useLocalSearchParams<{ barcode: string }>();
  const { estado, tentarDeNovo } = useProduto(barcode);
  const produto = estado.status === 'pronto' ? estado.dados.produto : undefined;
  const analise = estado.status === 'pronto' ? estado.dados.analise : undefined;
  const dados = estado.status === 'pronto' ? estado.dados : undefined;

  // Todo produto aberto entra no histórico do aparelho (e, com conta, sobe para ela; baixar a
  // lista da conta fica para a abertura do app e a aba Histórico).
  useEffect(() => {
    if (!dados) return;
    void guardarScan(itemDoResultado(dados, new Date()))
      .then(enviarPendentes)
      .catch(() => {});
  }, [dados]);

  const alternativas = useAlternativas(
    barcode,
    analise && analise.status !== 'dados_insuficientes' ? analise.nota : null,
    produto !== undefined,
  );

  const produtores = useProdutoresDoProduto(barcode, produto !== undefined);

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
          acoes={
            <RegistrarConsumo
              barcode={barcode}
              tipo={estado.dados.produto.tipo}
              nome={estado.dados.produto.nome}
              {...(estado.dados.nutricao && { nutricao: estado.dados.nutricao })}
            />
          }
          alternativas={
            <SecaoAlternativas
              estado={alternativas.estado}
              icone={iconeDoProduto(estado.dados.produto.tipo, estado.dados.produto.categorias)}
              onAbrir={(outro) =>
                router.push({ pathname: '/produto/[barcode]', params: { barcode: outro } })
              }
              onTentarDeNovo={alternativas.tentarDeNovo}
            />
          }
          produtores={
            <SecaoProdutoresLocais
              estado={produtores.estado}
              onAbrir={(id) => router.push({ pathname: '/produtor/[id]', params: { id } })}
              onVerNoMapa={() =>
                router.navigate({
                  pathname: '/mapa',
                  params: {
                    categoria:
                      produtores.estado.status === 'pronto'
                        ? (produtores.estado.dados.categoria ?? '')
                        : '',
                    // Muda a cada toque: o mapa reaplica o filtro mesmo com a mesma categoria.
                    pedido: String(Date.now()),
                  },
                })
              }
            />
          }
        />
      )}
    </Tela>
  );
}
