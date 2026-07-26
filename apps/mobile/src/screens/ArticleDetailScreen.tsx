import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api, ApiError } from '../lib/api';
import type { RootStackParamList } from '../App';

interface Article {
  id: string;
  title: string;
  slug: string;
  category: string;
  body: string;
  publishedAt: string | null;
}

type Props = NativeStackScreenProps<RootStackParamList, 'ArticleDetail'>;

export default function ArticleDetailScreen({ route }: Props) {
  const { slug } = route.params;
  const [article, setArticle] = useState<Article | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await api<Article>(`/articles/${slug}`);
      setArticle(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '載入失敗');
    } finally {
      setLoading(false);
    }
  }, [slug]);

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
  if (error || !article) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error || '找不到文章'}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{article.title}</Text>
      <Text style={styles.meta}>
        {article.publishedAt
          ? new Date(article.publishedAt).toLocaleString()
          : ''}
      </Text>
      <Text style={styles.body}>{article.body}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 8 },
  meta: { fontSize: 13, color: '#9ca3af', marginBottom: 20 },
  body: { fontSize: 16, lineHeight: 28, color: '#374151' },
  error: { color: '#dc2626' },
});
