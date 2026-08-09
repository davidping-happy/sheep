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
import { FitRemoteImage } from '../components/FitRemoteImage';
import { api, ApiError } from '../lib/api';
import type { HomeStackParamList } from '../navigation/types';
import { theme } from '../theme';

interface GroupBrief {
  id: string;
  name: string;
  leaderName?: string | null;
  meetingTime?: string | null;
  meetingPlace?: string | null;
  intro?: string | null;
  photoUrl?: string | null;
  imageUrls?: string[];
}

interface ZoneBrief {
  id: string;
  code: string;
  leaderName: string;
  intro?: string | null;
  photoUrl?: string | null;
  imageUrls?: string[];
  groups: GroupBrief[];
}

interface Area {
  id: string;
  name: string;
  description: string | null;
  photoUrl?: string | null;
  zones: ZoneBrief[];
}

type Props = NativeStackScreenProps<HomeStackParamList, 'Groups'>;

type Row =
  | { type: 'area'; area: Area }
  | { type: 'zone'; zone: ZoneBrief; areaName: string };

export default function GroupsScreen({ navigation }: Props) {
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await api<Area[]>('/groups/areas');
      setAreas(data);
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

  const rows: Row[] = areas.flatMap((area) => [
    { type: 'area' as const, area },
    ...(area.zones ?? []).map((z) => ({
      type: 'zone' as const,
      zone: z,
      areaName: area.name,
    })),
  ]);

  return (
    <FlatList
      style={styles.root}
      data={rows}
      keyExtractor={(item) =>
        item.type === 'area' ? `a-${item.area.id}` : `z-${item.zone.id}`
      }
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
      ListEmptyComponent={<Text style={styles.empty}>尚無牧區資料。</Text>}
      renderItem={({ item }) => {
        if (item.type === 'area') {
          return (
            <View style={styles.areaHeader}>
              <FitRemoteImage
                uri={item.area.photoUrl}
                maxHeight={200}
                style={styles.areaPhoto}
              />
              <Text style={styles.areaName}>{item.area.name}</Text>
              {item.area.description ? (
                <Text style={styles.areaDesc}>{item.area.description}</Text>
              ) : null}
              <Text style={styles.levelHint}>小區</Text>
            </View>
          );
        }
        const z = item.zone;
        return (
          <Pressable
            style={styles.card}
            onPress={() => navigation.navigate('ZoneDetail', { id: z.id })}
          >
            <FitRemoteImage uri={z.photoUrl} maxHeight={180} />
            <Text style={styles.zoneCode}>小區 {z.code}</Text>
            <Text style={styles.zoneLeader}>
              區長：{z.leaderName?.trim() || '即將更新'}
            </Text>
            {z.intro ? (
              <Text style={styles.zoneIntro} numberOfLines={3}>
                {z.intro}
              </Text>
            ) : null}
            <Text style={styles.meta}>
              {z.groups?.length ?? 0} 個小組 · 點擊查看
            </Text>
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
  areaHeader: { marginTop: 8, marginBottom: 10 },
  areaPhoto: { marginBottom: 8 },
  areaName: { fontSize: 20, fontWeight: '700', color: theme.color.ink },
  areaDesc: { fontSize: 13, color: theme.color.inkMuted, marginTop: 4 },
  levelHint: {
    marginTop: 14,
    fontSize: 12,
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
    marginBottom: 12,
    gap: 6,
  },
  zoneCode: { fontSize: 17, fontWeight: '700', color: theme.color.ink },
  zoneLeader: { fontSize: 14, color: theme.color.ink },
  zoneIntro: { fontSize: 13, color: theme.color.inkMuted, lineHeight: 20 },
  meta: { fontSize: 13, color: theme.color.brand, marginTop: 4 },
  empty: { textAlign: 'center', color: theme.color.inkMuted, marginTop: 40 },
  error: { color: theme.color.danger, marginBottom: 8 },
});
