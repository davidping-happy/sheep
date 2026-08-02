import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ImageGallery } from '../components/ImageGallery';
import { api, ApiError } from '../lib/api';
import type { HomeStackParamList } from '../navigation/types';
import { theme } from '../theme';

interface Article {
  id: string;
  title: string;
  slug: string;
  category: string;
  coverUrl?: string | null;
  imageUrls?: string[];
  body: string;
  publishedAt: string | null;
}

type Props = NativeStackScreenProps<HomeStackParamList, 'ArticleDetail'>;

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
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      <ImageGallery
        urls={article.imageUrls}
        coverUrl={article.coverUrl}
        height={220}
      />
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
  root: { flex: 1, backgroundColor: theme.color.bg },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.bg,
  },
  container: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: theme.color.bg,
    flexGrow: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.color.ink,
    marginBottom: 8,
  },
  meta: { fontSize: 13, color: theme.color.inkMuted, marginBottom: 20 },
  body: { fontSize: 16, lineHeight: 28, color: theme.color.ink },
  error: { color: theme.color.danger },
});
