import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';

/** 功能頁骨架佔位；串接 src/lib/api.ts 對應端點後替換。 */
export default function Placeholder({
  endpoint,
  note,
}: {
  endpoint: string;
  note?: string;
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>API 端點</Text>
      <Text style={styles.endpoint}>{endpoint}</Text>
      {note ? <Text style={styles.note}>{note}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 8,
    backgroundColor: theme.color.bg,
  },
  label: { fontSize: 12, color: theme.color.inkMuted },
  endpoint: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.color.brand,
  },
  note: {
    fontSize: 13,
    color: theme.color.ink,
    marginTop: 8,
    lineHeight: 20,
  },
});
