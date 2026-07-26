import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api, ApiError } from '../lib/api';
import type { RootStackParamList } from '../App';

interface ArticleSummary {
  id: string;
  title: string;
  slug: string;
  category: string;
  publishedAt: string | null;
}

const CAT: Record<string, string> = {
  DAILY_BREAD: '每日靈糧',
  PASTOR_COLUMN: '牧者專欄',
  TESTIMONY: '見證',
  OTHER: '其他',
};

type Props = NativeStackScreenProps<RootStackParamList, 'Articles'>;

export default function ArticlesScreen({ navigation }: Props) {
  const [items, setItems] = useState<ArticleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await api<ArticleSummary[]>('/articles');
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
        <Text style={styles.empty}>尚無已發布文章，請稍後再看。</Text>
      }
      renderItem={({ item }) => (
        <Pressable
          style={styles.card}
          onPress={() =>
            navigation.navigate('ArticleDetail', { slug: item.slug })
          }
        >
          <Text style={styles.badge}>{CAT[item.category] ?? item.category}</Text>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.meta}>
            {item.publishedAt
              ? new Date(item.publishedAt).toLocaleDateString()
              : ''}
          </Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, gap: 10, paddingBottom: 32 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 10,
  },
  badge: {
    alignSelf: 'flex-start',
    fontSize: 11,
    color: '#4f46e5',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 8,
  },
  title: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  meta: { marginTop: 6, fontSize: 12, color: '#9ca3af' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40 },
  error: { color: '#dc2626', marginBottom: 8 },
});
