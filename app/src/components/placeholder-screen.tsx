import { StyleSheet, Text, View } from 'react-native';

type Props = {
  title: string;
  description: string;
};

/** Tela provisória usada pelas abas enquanto as features não existem. */
export function PlaceholderScreen({ title, description }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
  },
});
