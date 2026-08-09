import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FitRemoteImage } from '../components/FitRemoteImage';
import { ImageGallery } from '../components/ImageGallery';
import { api, ApiError } from '../lib/api';
import type { HomeStackParamList } from '../navigation/types';
import { theme } from '../theme';

interface GroupBrief {
  id: string;
  name: string;
  leaderName?: string | null;
  intro?: string | null;
  photoUrl?: string | null;
  imageUrls?: string[];
}

interface ZoneDetail {
  id: string;
  code: string;
  leaderName: string;
  intro: string | null;
  photoUrl?: string | null;
  imageUrls?: string[];
  pastoralArea: { id: string; name: string };
  groups: GroupBrief[];
}

type Props = NativeStackScreenProps<HomeStackParamList, 'ZoneDetail'>;

export default function ZoneDetailScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const [zone, setZone] = useState<ZoneDetail | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await api<ZoneDetail>(`/groups/zones/${id}`);
      setZone(data);
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
  if (error || !zone) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error || '找不到小區'}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      <ImageGallery
        urls={zone.imageUrls}
        coverUrl={zone.photoUrl}
        maxHeight={360}
      />
      <Text style={styles.area}>{zone.pastoralArea.name}</Text>
      <Text style={styles.title}>小區 {zone.code}</Text>
      <View style={styles.block}>
        <Text style={styles.label}>區長</Text>
        <Text style={styles.value}>
          {zone.leaderName?.trim() || '即將更新'}
        </Text>
      </View>
      {zone.intro ? <Text style={styles.intro}>{zone.intro}</Text> : null}

      <Text style={styles.section}>小組</Text>
      {zone.groups.length === 0 ? (
        <Text style={styles.empty}>此小區尚無小組。</Text>
      ) : (
        zone.groups.map((g) => (
          <Pressable
            key={g.id}
            style={styles.card}
            onPress={() => navigation.navigate('GroupDetail', { id: g.id })}
          >
            <FitRemoteImage uri={g.photoUrl} maxHeight={160} />
            <Text style={styles.groupName}>{g.name}</Text>
            <Text style={styles.meta}>
              小組長：{g.leaderName?.trim() || '即將更新'}
            </Text>
            {g.intro ? (
              <Text style={styles.groupIntro} numberOfLines={3}>
                {g.intro}
              </Text>
            ) : null}
          </Pressable>
        ))
      )}
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
    gap: 12,
    backgroundColor: theme.color.bg,
    flexGrow: 1,
    paddingBottom: 40,
  },
  area: { fontSize: 13, color: theme.color.brand, fontWeight: '600' },
  title: { fontSize: 24, fontWeight: '700', color: theme.color.ink },
  intro: {
    fontSize: 16,
    lineHeight: 26,
    color: theme.color.ink,
  },
  block: {
    backgroundColor: theme.color.bgElevated,
    borderRadius: theme.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  label: { fontSize: 12, color: theme.color.inkMuted, marginBottom: 4 },
  value: { fontSize: 16, color: theme.color.ink },
  section: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '700',
    color: theme.color.brand,
    letterSpacing: 1,
  },
  card: {
    backgroundColor: theme.color.bgElevated,
    borderRadius: theme.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.color.border,
    gap: 6,
  },
  groupName: { fontSize: 17, fontWeight: '700', color: theme.color.ink },
  meta: { fontSize: 14, color: theme.color.ink },
  groupIntro: { fontSize: 13, color: theme.color.inkMuted, lineHeight: 20 },
  empty: { color: theme.color.inkMuted },
  error: { color: theme.color.danger },
});
