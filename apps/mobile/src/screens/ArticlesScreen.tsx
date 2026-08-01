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
import { RemoteImage } from '../components/RemoteImage';
import { api, ApiError } from '../lib/api';
import type { HomeStackParamList } from '../navigation/types';
import { theme } from '../theme';

interface ArticleSummary {
  id: string;
  title: string;
  slug: string;
  category: string;
  coverUrl?: string | null;
  publishedAt: string | null;
}

const CAT: Record<string, string> = {
  DAILY_BREAD: '每日靈糧',
  PASTOR_COLUMN: '牧者專欄',
  TESTIMONY: '見證',
  OTHER: '其他',
};

type Props = NativeStackScreenProps<HomeStackParamList, 'Articles'>;

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
        <Text style={styles.empty}>尚無已發布文章，請稍後再看。</Text>
      }
      renderItem={({ item }) => (
        <Pressable
          style={styles.card}
          onPress={() =>
            navigation.navigate('ArticleDetail', { slug: item.slug })
          }
        >
          <RemoteImage uri={item.coverUrl} style={styles.thumb} />
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
  root: { flex: 1, backgroundColor: theme.color.bg },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.bg,
  },
  list: { padding: 16, gap: 10, paddingBottom: 32, flexGrow: 1 },
  thumb: {
    width: '100%',
    height: 140,
    borderRadius: theme.radius.sm,
    marginBottom: 10,
  },
  card: {
    backgroundColor: theme.color.bgElevated,
    borderRadius: theme.radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.color.border,
    marginBottom: 10,
  },
  badge: {
    alignSelf: 'flex-start',
    fontSize: 11,
    color: theme.color.brand,
    backgroundColor: theme.color.brandSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
    marginBottom: 8,
  },
  title: { fontSize: 16, fontWeight: '600', color: theme.color.ink },
  meta: { marginTop: 6, fontSize: 12, color: theme.color.inkMuted },
  empty: { textAlign: 'center', color: theme.color.inkMuted, marginTop: 40 },
  error: { color: theme.color.danger, marginBottom: 8 },
});
