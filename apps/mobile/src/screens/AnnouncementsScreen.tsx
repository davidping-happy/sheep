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
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RemoteImage } from '../components/RemoteImage';
import { extractAnnouncementHighlights } from '../lib/announcement-highlights';
import { api, ApiError } from '../lib/api';
import type { HomeStackParamList } from '../navigation/types';
import { theme } from '../theme';

interface Announcement {
  id: string;
  title: string;
  body: string;
  imageUrl?: string | null;
  publishedAt: string | null;
  audience: string;
}

type Props = NativeStackScreenProps<HomeStackParamList, 'Announcements'>;

export default function AnnouncementsScreen({ navigation }: Props) {
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
      renderItem={({ item }) => {
        const highlights = extractAnnouncementHighlights(item.body, 3);
        return (
          <Pressable
            style={styles.card}
            onPress={() =>
              navigation.navigate('AnnouncementDetail', { id: item.id })
            }
          >
            <RemoteImage uri={item.imageUrl} style={styles.image} />
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.meta}>
              {item.publishedAt
                ? new Date(item.publishedAt).toLocaleString()
                : ''}
            </Text>
            {highlights.length > 0 ? (
              <View style={styles.highlights}>
                {highlights.map((h, idx) => (
                  <View key={`${item.id}-${idx}`} style={styles.bulletRow}>
                    <Text style={styles.bullet}>•</Text>
                    <Text style={styles.highlightText}>{h}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            <View style={styles.moreRow}>
              <Text style={styles.more}>查看詳情</Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={theme.color.brand}
              />
            </View>
          </Pressable>
        );
      }}
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
  image: {
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
    marginBottom: 12,
  },
  title: { fontSize: 17, fontWeight: '700', color: theme.color.ink },
  meta: {
    fontSize: 12,
    color: theme.color.inkMuted,
    marginTop: 4,
    marginBottom: 10,
  },
  highlights: { gap: 6, marginBottom: 12 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  bullet: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.color.brand,
    fontWeight: '700',
  },
  highlightText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: theme.color.ink,
  },
  moreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  more: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.color.brand,
  },
  empty: { textAlign: 'center', color: theme.color.inkMuted, marginTop: 40 },
  error: { color: theme.color.danger, marginBottom: 8 },
});
