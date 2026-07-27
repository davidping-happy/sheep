import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { api, ApiError } from '../lib/api';
import { theme } from '../theme';

interface Announcement {
  id: string;
  title: string;
  body: string;
  publishedAt: string | null;
  audience: string;
}

export default function AnnouncementsScreen() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await api<Announcement[]>('/announcements');
      setItems(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '載入失敗');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.root}
      data={items}
      keyExtractor={(i) => i.id}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
        />
      }
      ListHeaderComponent={
        error ? <Text style={styles.error}>{error}</Text> : null
      }
      ListEmptyComponent={
        <Text style={styles.empty}>尚無公告。</Text>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.meta}>
            {item.publishedAt
              ? new Date(item.publishedAt).toLocaleString()
              : ''}
          </Text>
          <Text style={styles.body}>{item.body}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.bg },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.bg,
  },
  list: { padding: 16, paddingBottom: 32, flexGrow: 1 },
  card: {
    backgroundColor: theme.color.bgElevated,
    borderRadius: theme.radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.color.border,
    marginBottom: 12,
  },
  title: { fontSize: 17, fontWeight: '700', color: theme.color.ink },
  meta: {
    fontSize: 12,
    color: theme.color.inkMuted,
    marginTop: 4,
    marginBottom: 10,
  },
  body: { fontSize: 15, lineHeight: 24, color: theme.color.ink },
  empty: { textAlign: 'center', color: theme.color.inkMuted, marginTop: 40 },
  error: { color: theme.color.danger, marginBottom: 8 },
});
