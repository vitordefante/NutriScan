import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Botao } from '@/components/ui/botao';
import { IconePixel, type NomeIconePixel } from '@/components/ui/icone-pixel';
import { Texto } from '@/components/ui/texto';
import type { TipoErroProduto } from '@/services/api-produtos';
import { cores, espaco } from '@/theme/tokens';

const BLOCOS_CARREGANDO = 10;

/** "ANALISANDO..." com uma barrinha pixel que vai enchendo. */
export function EstadoCarregando({ barcode }: { barcode: string }) {
  const [cheios, setCheios] = useState(1);
  useEffect(() => {
    const id = setInterval(() => setCheios((n) => (n % BLOCOS_CARREGANDO) + 1), 180);
    return () => clearInterval(id);
  }, []);

  return (
    <View style={estilos.centro} accessible accessibilityLabel="Analisando o produto">
      <IconePixel nome="escanear" escala={5} />
      <Texto variante="pixel" style={{ fontSize: 16 }}>
        ANALISANDO...
      </Texto>
      <View style={estilos.barra}>
        {Array.from({ length: BLOCOS_CARREGANDO }, (_, i) => (
          <View
            key={i}
            style={[estilos.bloco, { backgroundColor: i < cheios ? cores.tinta : cores.vazio }]}
          />
        ))}
      </View>
      <Texto variante="apoio" style={{ textAlign: 'center' }}>
        Buscando {barcode}
        {'\n'}no Open Food Facts
      </Texto>
    </View>
  );
}

type Conteudo = {
  icone: NomeIconePixel;
  titulo: string;
  texto: (barcode: string) => string;
  /** Mostrar "Tentar de novo" (o problema pode ser passageiro). */
  repetir: boolean;
};

const ERROS: Record<TipoErroProduto, Conteudo> = {
  produto_nao_encontrado: {
    icone: 'lupa',
    titulo: 'Produto não encontrado',
    texto: (b) =>
      `O código ${b} ainda não está no Open Food Facts (alimentos) nem no Open Beauty Facts (cosméticos).`,
    repetir: false,
  },
  codigo_invalido: {
    icone: 'alerta',
    titulo: 'Código inválido',
    texto: (b) => `"${b}" não parece um código de barras de produto.`,
    repetir: false,
  },
  fonte_indisponivel: {
    icone: 'alerta',
    titulo: 'Base de produtos fora do ar',
    texto: () => 'O Open Food Facts não respondeu agora. Tente de novo em instantes.',
    repetir: true,
  },
  sem_conexao: {
    icone: 'alerta',
    titulo: 'Sem conexão com o servidor',
    texto: () => 'Confira a internet do celular e tente de novo.',
    repetir: true,
  },
  tempo_esgotado: {
    icone: 'alerta',
    titulo: 'O servidor demorou demais',
    texto: () => 'A resposta não chegou a tempo. Tente de novo em instantes.',
    repetir: true,
  },
  servidor_fora: {
    icone: 'alerta',
    titulo: 'Servidor do NutriScan fora do ar',
    texto: () => 'O servidor não está respondendo agora. Tente de novo em instantes.',
    repetir: true,
  },
  inesperado: {
    icone: 'alerta',
    titulo: 'Algo deu errado',
    texto: () => 'Não conseguimos analisar este produto agora.',
    repetir: true,
  },
};

type PropsErro = {
  tipo: TipoErroProduto;
  barcode: string;
  onTentarDeNovo: () => void;
  onEscanearOutro: () => void;
};

export function EstadoErro({ tipo, barcode, onTentarDeNovo, onEscanearOutro }: PropsErro) {
  const erro = ERROS[tipo];
  return (
    <View style={estilos.centro}>
      <IconePixel nome={erro.icone} escala={5} />
      <Texto variante="titulo" style={{ textAlign: 'center', fontSize: 22 }}>
        {erro.titulo}
      </Texto>
      <Texto variante="apoio" style={{ textAlign: 'center', fontSize: 15 }}>
        {erro.texto(barcode)}
      </Texto>
      <View style={estilos.botoes}>
        {erro.repetir && <Botao titulo="Tentar de novo" onPress={onTentarDeNovo} />}
        <Botao
          titulo="Escanear outro"
          variante={erro.repetir ? 'secundario' : 'primario'}
          onPress={onEscanearOutro}
        />
      </View>
    </View>
  );
}

/** Caixa amarela explicando o que faltou (nota parcial ou sem nota). */
export function AvisoFaltando({ faltando, texto }: { faltando: string[]; texto: string }) {
  return (
    <View style={estilos.aviso}>
      <IconePixel nome="alerta" />
      <Texto style={{ flex: 1, fontSize: 14, lineHeight: 20 }}>
        <Texto style={{ fontSize: 14, lineHeight: 20 }} variante="subtitulo">
          Faltou: {faltando.join(', ')}.
        </Texto>{' '}
        {texto}
      </Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    paddingHorizontal: 32,
  },
  barra: {
    width: 220,
    flexDirection: 'row',
    gap: 3,
    padding: 3,
    borderWidth: espaco.borda,
    borderColor: cores.tinta,
  },
  bloco: { flex: 1, height: 14 },
  botoes: { alignSelf: 'stretch', gap: 12, marginTop: 8 },
  aviso: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: cores.avisoClaro,
    borderWidth: espaco.borda,
    borderColor: cores.tinta,
    padding: 14,
  },
});
