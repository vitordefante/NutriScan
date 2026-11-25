import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Aviso } from '@/components/ui/aviso';
import { Botao } from '@/components/ui/botao';
import { CabecalhoTela } from '@/components/ui/cabecalho-tela';
import { CampoTexto } from '@/components/ui/campo-texto';
import { Etiqueta } from '@/components/ui/etiqueta';
import { Seletor } from '@/components/ui/seletor';
import { Tela } from '@/components/ui/tela';
import { Texto } from '@/components/ui/texto';
import { VersaoApp } from '@/components/versao-app';
import { type ModoConta, useFormularioConta } from '@/hooks/use-formulario-conta';
import { type EstadoMeuCatalogo, useMeuCatalogo } from '@/hooks/use-meu-catalogo';
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
          <VersaoApp />
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
  // Uma busca só para a etiqueta "Produtor" e a Área do produtor.
  const { estado: catalogo } = useMeuCatalogo();

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
        <View style={estilos.topoCartao}>
          <Texto variante="pixel" style={{ fontSize: 11 }}>
            CONECTADO COMO
          </Texto>
          {catalogo.status === 'pronto' && <Etiqueta texto="Produtor" fundo={cores.destaque} />}
        </View>
        <Texto variante="subtitulo" numberOfLines={1}>
          {email}
        </Texto>
        <Texto variante="apoio">Seu histórico de scans é sincronizado com sua conta.</Texto>
      </View>

      <AreaProdutor estado={catalogo} />

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

/** Conta ligada a um produtor: atalho para o catálogo. Conta comum: "Sou produtor". */
function AreaProdutor({ estado }: { estado: EstadoMeuCatalogo }) {
  if (estado.status === 'nao_e_produtor') {
    return (
      <Pressable
        onPress={() => router.push('/sou-produtor')}
        accessibilityRole="link"
        hitSlop={8}
        style={{ gap: 2 }}
      >
        <Texto variante="apoio">Você vende no mapa de produtores?</Texto>
        <Texto style={estilos.link}>Sou produtor e tenho um código</Texto>
      </Pressable>
    );
  }
  if (estado.status !== 'pronto') return null;

  const { produtor, itens, novos } = estado.dados;
  const emAnalise =
    novos.filter((n) => n.situacao === 'em_analise').length +
    itens.filter((i) => i.alteracao?.situacao === 'em_analise').length;
  const recusados =
    novos.filter((n) => n.situacao === 'recusada').length +
    itens.filter((i) => i.alteracao?.situacao === 'recusada').length;
  const resumo = [
    `${itens.length} ${itens.length === 1 ? 'item' : 'itens'} no mapa`,
    emAnalise > 0 && `${emAnalise} em análise`,
    recusados > 0 && `${recusados} ${recusados === 1 ? 'recusado' : 'recusados'}`,
  ].filter(Boolean);

  return (
    <View style={estilos.cartao}>
      <Texto variante="pixel" style={{ fontSize: 11 }}>
        ÁREA DO PRODUTOR
      </Texto>
      <Texto variante="subtitulo" numberOfLines={1}>
        {produtor.nome}
      </Texto>
      <Texto variante="apoio">{resumo.join(' · ')}</Texto>
      <Botao
        titulo="Meu catálogo"
        onPress={() => router.push('/meu-catalogo')}
        style={{ marginTop: 6 }}
      />
    </View>
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
  topoCartao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  link: { fontFamily: fontes.textoNegrito, fontSize: 14, textDecorationLine: 'underline' },
  excluir: {
    fontFamily: fontes.textoNegrito,
    fontSize: 14,
    // O coral não tem contraste suficiente como texto: vermelho de texto da faixa "péssimo".
    color: faixas.pessimo.texto,
    textDecorationLine: 'underline',
  },
});
