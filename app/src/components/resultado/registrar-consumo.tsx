import type { ProductKind } from '@nutriscan/shared';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Botao } from '@/components/ui/botao';
import { Texto } from '@/components/ui/texto';
import { useRegistrarConsumo } from '@/hooks/use-registrar-consumo';
import { useSessao } from '@/lib/sessao';
import { fontes } from '@/theme/tokens';

type Props = { barcode: string; tipo: ProductKind };

/** "Registrar consumo" (alimento) / "Registrar uso" (cosmético): 1 toque, com data e hora de agora. */
export function RegistrarConsumo({ barcode, tipo }: Props) {
  const sessao = useSessao();
  const { estado, registrarAgora } = useRegistrarConsumo(barcode);
  const acao = tipo === 'cosmetico' ? 'uso' : 'consumo';

  if (sessao.status !== 'conectado') {
    return (
      <View style={estilos.bloco}>
        <Botao
          titulo={`Registrar ${acao}`}
          variante="secundario"
          onPress={() => router.navigate('/perfil')}
        />
        <Texto variante="legenda" style={estilos.centro}>
          Entre na sua conta (aba Perfil) para registrar o que você{' '}
          {tipo === 'cosmetico' ? 'usa' : 'consome'} e ver o resumo da semana.
        </Texto>
      </View>
    );
  }

  if (estado.status === 'feito') {
    return (
      <View style={estilos.feito} accessibilityLiveRegion="polite">
        <Texto style={{ flex: 1 }}>✓ Registrado no seu {acao} de hoje.</Texto>
        <Pressable
          onPress={() => router.navigate('/historico')}
          accessibilityRole="link"
          hitSlop={10}
        >
          <Texto style={estilos.link}>Ver resumo</Texto>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={estilos.bloco}>
      <Botao
        titulo={estado.status === 'enviando' ? 'Registrando…' : `Registrar ${acao}`}
        variante="secundario"
        onPress={() => void registrarAgora()}
        desabilitado={estado.status === 'enviando'}
      />
      {estado.status === 'erro' && (
        <Texto variante="legenda" style={estilos.centro} accessibilityLiveRegion="polite">
          {estado.mensagem}
        </Texto>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  bloco: { gap: 8 },
  centro: { textAlign: 'center' },
  feito: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52 },
  link: { fontFamily: fontes.textoNegrito, fontSize: 14, textDecorationLine: 'underline' },
});
