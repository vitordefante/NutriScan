import { NativeTabs } from 'expo-router/native-tabs';

import { cores, fontes } from '@/theme/tokens';

/**
 * Abas principais do app (barra nativa do sistema).
 * Ícones provisórios (SF Symbols no iOS, Material no Android) — os ícones pixel art
 * precisam virar imagens PNG para a barra nativa (pendência registrada em docs/design-system.md).
 */
export default function TabsLayout() {
  return (
    <NativeTabs
      tintColor={cores.tinta}
      labelStyle={{ fontFamily: fontes.pixel, fontSize: 10 }}
      backgroundColor={cores.papel}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Escanear</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="barcode.viewfinder" md="barcode_scanner" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="historico">
        <NativeTabs.Trigger.Label>Histórico</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="clock" md="history" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="mapa">
        <NativeTabs.Trigger.Label>Mapa</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="map" md="map" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="perfil">
        <NativeTabs.Trigger.Label>Perfil</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.crop.circle" md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
