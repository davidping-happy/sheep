import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RemoteImage } from '../components/RemoteImage';
import { api, ApiError } from '../lib/api';
import type { HomeStackParamList } from '../navigation/types';
import { theme } from '../theme';

interface Announcement {
  id: string;
  title: string;
  body: string;
  imageUrl?: string | null;
  publishedAt: string | null;
}

type Props = NativeStackScreenProps<HomeStackParamList, 'AnnouncementDetail'>;

export default function AnnouncementDetailScreen({ route }: Props) {
  const { id } = route.params;
  const [item, setItem] = useState<Announcement | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await api<Announcement>(`/announcements/${id}`);
      setItem(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '載入失敗');
    } finally {
      setLoading(false);
    }
  }, [id]);

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
  if (error || !item) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error || '找不到這則資訊'}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      <RemoteImage uri={item.imageUrl} style={styles.image} />
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.meta}>
        {item.publishedAt
          ? new Date(item.publishedAt).toLocaleString()
          : ''}
      </Text>
      <Text style={styles.body}>{item.body}</Text>
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
    padding: 24,
  },
  container: { padding: 16, paddingBottom: 40 },
  image: {
    width: '100%',
    height: 200,
    borderRadius: theme.radius.md,
    marginBottom: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.color.ink,
    lineHeight: 30,
  },
  meta: {
    fontSize: 13,
    color: theme.color.inkMuted,
    marginTop: 8,
    marginBottom: 16,
  },
  body: { fontSize: 16, lineHeight: 26, color: theme.color.ink },
  error: { color: theme.color.danger, textAlign: 'center' },
});
