import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Aviso } from '@/components/ui/aviso';
import { Botao } from '@/components/ui/botao';
import { CabecalhoTela } from '@/components/ui/cabecalho-tela';
import { CampoTexto } from '@/components/ui/campo-texto';
import { Seletor } from '@/components/ui/seletor';
import { Tela } from '@/components/ui/tela';
import { Texto } from '@/components/ui/texto';
import { type ModoConta, useFormularioConta } from '@/hooks/use-formulario-conta';
import { excluirMinhaConta, sair, useSessao } from '@/lib/sessao';
import { cores, espaco, faixas, fontes } from '@/theme/tokens';

const MODOS = [
  { valor: 'entrar', rotulo: 'Entrar' },
  { valor: 'criar', rotulo: 'Criar conta' },
] as const satisfies readonly { valor: ModoConta; rotulo: string }[];

/** Aba Perfil: entrar / criar conta, ou os dados da conta conectada. */
export default function TelaPerfil() {
  const sessao = useSessao();
  return (
    <Tela comAbas>
      <CabecalhoTela titulo="PERFIL" />
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={estilos.conteudo}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="never"
        >
          {sessao.status === 'conectado' ? (
            <Conectado email={sessao.usuario.email} />
          ) : sessao.status === 'anonimo' ? (
            <FormularioConta />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Tela>
  );
}

function FormularioConta() {
  const f = useFormularioConta();
  const criar = f.modo === 'criar';
  return (
    <>
      <View style={{ gap: 8 }}>
        <Texto variante="titulo">Sua conta</Texto>
        <Texto variante="apoio">
          Com uma conta, seu histórico fica salvo e você registra o que consome para ver o resumo da
          semana. Escanear continua funcionando sem conta.
        </Texto>
      </View>

      <Seletor opcoes={MODOS} valor={f.modo} onMudar={f.mudarModo} rotuloAcessivel="Conta" />

      <View style={{ gap: 14 }}>
        <CampoTexto
          rotulo="E-mail"
          value={f.email}
          onChangeText={f.setEmail}
          placeholder="voce@exemplo.com"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          textContentType={criar ? 'username' : 'emailAddress'}
          returnKeyType="next"
          maxLength={254}
        />
        <CampoTexto
          rotulo={criar ? 'Senha (8 caracteres ou mais)' : 'Senha'}
          value={f.senha}
          onChangeText={f.setSenha}
          secureTextEntry
          autoCapitalize="none"
          autoComplete={criar ? 'new-password' : 'current-password'}
          textContentType={criar ? 'newPassword' : 'password'}
          returnKeyType="go"
          onSubmitEditing={() => void f.enviar()}
          maxLength={200}
        />
      </View>

      {f.aviso && <Aviso>{f.aviso}</Aviso>}

      <Botao
        titulo={f.enviando ? 'Aguarde…' : criar ? 'Criar conta' : 'Entrar'}
        onPress={() => void f.enviar()}
        desabilitado={!f.pronto || f.enviando}
      />

      <Texto variante="legenda">
        A senha é guardada no servidor só em forma cifrada (argon2) e o login fica no Keychain do
        aparelho. Você pode excluir a conta e todos os dados dela a qualquer momento.
      </Texto>
    </>
  );
}

function Conectado({ email }: { email: string }) {
  const [excluindo, setExcluindo] = useState(false);

  function confirmarExclusao() {
    Alert.alert(
      'Excluir sua conta?',
      'O histórico e o log de consumo da conta são apagados no servidor. Não dá para desfazer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            setExcluindo(true);
            excluirMinhaConta()
              .catch(() =>
                Alert.alert('Não foi possível excluir agora', 'Confira a conexão e tente de novo.'),
              )
              .finally(() => setExcluindo(false));
          },
        },
      ],
    );
  }

  return (
    <>
      <View style={estilos.cartao}>
        <Texto variante="pixel" style={{ fontSize: 11 }}>
          CONECTADO COMO
        </Texto>
        <Texto variante="subtitulo" numberOfLines={1}>
          {email}
        </Texto>
        <Texto variante="apoio">
          Seu histórico de scans é sincronizado com a conta, e o que você registra como consumido
          aparece no resumo da aba Histórico.
        </Texto>
      </View>

      <Botao titulo="Sair" variante="secundario" onPress={() => void sair()} />

      <Pressable
        onPress={confirmarExclusao}
        disabled={excluindo}
        accessibilityRole="button"
        hitSlop={10}
        style={{ alignSelf: 'center' }}
      >
        <Texto style={estilos.excluir}>{excluindo ? 'Excluindo…' : 'Excluir minha conta'}</Texto>
      </Pressable>
    </>
  );
}

const estilos = StyleSheet.create({
  conteudo: { paddingHorizontal: espaco.margemTela, paddingTop: 8, paddingBottom: 48, gap: 22 },
  cartao: {
    borderWidth: espaco.borda,
    borderColor: cores.tinta,
    padding: 16,
    gap: 10,
  },
  excluir: {
    fontFamily: fontes.textoNegrito,
    fontSize: 14,
    // O coral não tem contraste suficiente como texto: vermelho de texto da faixa "péssimo".
    color: faixas.pessimo.texto,
    textDecorationLine: 'underline',
  },
});
