import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';

import { Aviso } from '@/components/ui/aviso';
import { Botao } from '@/components/ui/botao';
import { CabecalhoTela } from '@/components/ui/cabecalho-tela';
import { CampoTexto } from '@/components/ui/campo-texto';
import { Tela } from '@/components/ui/tela';
import { Texto } from '@/components/ui/texto';
import { useSessao } from '@/lib/sessao';
import { ErroApi } from '@/services/api';
import { vincular } from '@/services/api-conta-produtor';
import { espaco } from '@/theme/tokens';

/** Erros cuja mensagem da API já serve para o produtor. */
const MENSAGEM_DA_API = new Set([
  'convite_invalido',
  'produtor_ja_vinculado',
  'conta_ja_vinculada',
  'muitas_tentativas',
]);

/** "Sou produtor": liga a conta ao produtor do mapa com o código que o autor mandou. */
export default function TelaSouProdutor() {
  const sessao = useSessao();
  const [codigo, setCodigo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const pronto = codigo.replace(/[^A-Za-z0-9]/g, '').length === 8;

  async function ligar() {
    if (sessao.status !== 'conectado' || !pronto || enviando) return;
    setAviso(null);
    setEnviando(true);
    try {
      await vincular(sessao.token, codigo);
      router.replace('/meu-catalogo');
    } catch (err) {
      setAviso(
        err instanceof ErroApi && MENSAGEM_DA_API.has(err.tipo)
          ? err.message
          : 'Não foi possível ligar agora. Confira a conexão e tente de novo.',
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Tela>
      <CabecalhoTela titulo="SOU PRODUTOR" onVoltar={() => router.back()} />
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={estilos.conteudo}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="never"
        >
          <View style={{ gap: 8 }}>
            <Texto variante="titulo">Cuide do seu catálogo pelo app</Texto>
            <Texto variante="apoio">
              Com a conta ligada ao seu produtor no mapa, você muda preços na hora e manda itens
              novos com foto. Para ligar, use o código que o autor do app mandou pelo WhatsApp (vale
              7 dias e uma vez só).
            </Texto>
          </View>

          {sessao.status === 'conectado' ? (
            <>
              <CampoTexto
                rotulo="Código"
                value={codigo}
                onChangeText={setCodigo}
                placeholder="ABCD-1234"
                autoCapitalize="characters"
                autoCorrect={false}
                autoComplete="off"
                maxLength={12}
                returnKeyType="go"
                onSubmitEditing={() => void ligar()}
                style={{ letterSpacing: 2 }}
              />
              {aviso && <Aviso>{aviso}</Aviso>}
              <Botao
                titulo={enviando ? 'Aguarde…' : 'Ligar à minha conta'}
                onPress={() => void ligar()}
                desabilitado={!pronto || enviando}
              />
              <Texto variante="legenda">
                Conta: {sessao.usuario.email}. Ainda não está no mapa? Toque em “Quero aparecer no
                mapa”, na aba Mapa.
              </Texto>
            </>
          ) : (
            <Aviso>Entre na sua conta (ou crie uma) na aba Perfil antes de usar o código.</Aviso>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  conteudo: { padding: espaco.margemTela, paddingTop: 8, gap: 22, paddingBottom: 48 },
});
