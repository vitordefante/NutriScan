import * as Updates from 'expo-updates';

import { Texto } from '@/components/ui/texto';

const dataHora = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

/**
 * Versão do app e a atualização em uso (EAS Update). Mostra se o aparelho já recebeu a
 * última atualização publicada: ela é baixada ao abrir o app e entra na próxima abertura.
 */
export function VersaoApp() {
  let texto: string;
  if (__DEV__ || !Updates.isEnabled) texto = 'Desenvolvimento';
  else if (Updates.isEmbeddedLaunch || !Updates.createdAt) {
    texto = `Versão ${Updates.runtimeVersion} · instalada pelo Mac`;
  } else {
    texto = `Versão ${Updates.runtimeVersion} · atualizada em ${dataHora.format(Updates.createdAt)}`;
  }
  return (
    <Texto variante="legenda" style={{ textAlign: 'center', marginTop: 8 }}>
      {texto}
    </Texto>
  );
}
