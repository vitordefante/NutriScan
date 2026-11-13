import { type BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';
import { router, useFocusEffect, useIsFocused } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { Visor } from '@/components/scanner/visor';
import { Botao, BotaoIcone } from '@/components/ui/botao';
import { CabecalhoTela } from '@/components/ui/cabecalho-tela';
import { IconePixel } from '@/components/ui/icone-pixel';
import { Tela } from '@/components/ui/tela';
import { Texto } from '@/components/ui/texto';
import { normalizarCodigo } from '@/lib/codigo-barras';
import { cores, espaco } from '@/theme/tokens';

/** Formatos dos códigos de barras de produtos de varejo. */
const TIPOS_DE_CODIGO = ['ean13', 'ean8', 'upc_a', 'upc_e'] as const;

export default function TelaEscanear() {
  const [permissao, pedirPermissao] = useCameraPermissions();
  const focada = useIsFocused();
  const [lanterna, setLanterna] = useState(false);
  // A câmera dispara várias leituras por segundo; só a primeira abre o resultado.
  const jaLeu = useRef(false);

  useFocusEffect(
    useCallback(() => {
      jaLeu.current = false; // voltou para o scanner: pode ler de novo
      return () => setLanterna(false);
    }, []),
  );

  function aoLerCodigo({ data }: BarcodeScanningResult) {
    if (jaLeu.current) return;
    const barcode = normalizarCodigo(data);
    if (!barcode) return;
    jaLeu.current = true;
    router.push({ pathname: '/produto/[barcode]', params: { barcode } });
  }

  return (
    <Tela comAbas>
      <CabecalhoTela titulo="ESCANEAR" />

      <View style={estilos.camera}>
        {permissao?.granted ? (
          <>
            {/* Só uma câmera pode ficar ativa: desmonta quando a aba sai de foco. */}
            {focada && (
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                enableTorch={lanterna}
                barcodeScannerSettings={{ barcodeTypes: [...TIPOS_DE_CODIGO] }}
                onBarcodeScanned={aoLerCodigo}
              />
            )}
            <Visor />
            <View style={estilos.lanterna}>
              <BotaoIcone
                rotuloAcessivel={lanterna ? 'Desligar lanterna' : 'Ligar lanterna'}
                tamanho={48}
                onPress={() => setLanterna((l) => !l)}
              >
                <IconePixel nome="raio" cor={lanterna ? '#C79A00' : cores.tinta} />
              </BotaoIcone>
            </View>
          </>
        ) : (
          permissao && (
            <View style={estilos.semPermissao}>
              <Texto cor={cores.papel} style={{ textAlign: 'center' }}>
                Para ler o código de barras, o NutriScan precisa da câmera.
              </Texto>
              {permissao.canAskAgain ? (
                <Botao titulo="Permitir câmera" variante="secundario" onPress={pedirPermissao} />
              ) : (
                <Botao
                  titulo="Abrir Ajustes"
                  variante="secundario"
                  onPress={() => void Linking.openSettings()}
                />
              )}
            </View>
          )
        )}
      </View>

      <View style={estilos.rodape}>
        <View style={{ gap: 6 }}>
          <Texto variante="subtitulo" style={estilos.centro}>
            Aponte para o código de barras
          </Texto>
          <Texto variante="apoio" style={estilos.centro}>
            Funciona com alimentos e cosméticos.
          </Texto>
        </View>
        <Botao
          titulo="Digitar código"
          variante="secundario"
          icone="teclado"
          onPress={() => router.push('/digitar-codigo')}
        />
      </View>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  camera: {
    flex: 1,
    marginHorizontal: 20,
    backgroundColor: cores.camera,
    borderWidth: espaco.borda,
    borderColor: cores.tinta,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  lanterna: { position: 'absolute', right: 14, bottom: 14 },
  semPermissao: { padding: 24, gap: 20, alignItems: 'center' },
  rodape: { paddingHorizontal: espaco.margemTela, paddingTop: 20, paddingBottom: 16, gap: 16 },
  centro: { textAlign: 'center' },
});
