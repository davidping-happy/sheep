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
import type { HomeStackParamList } from '../navigation/types';
import { theme } from '../theme';

interface GroupBrief {
  id: string;
  name: string;
  meetingTime?: string | null;
  meetingPlace?: string | null;
  intro?: string | null;
}

interface Area {
  id: string;
  name: string;
  description: string | null;
  groups: GroupBrief[];
}

type Props = NativeStackScreenProps<HomeStackParamList, 'Groups'>;

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

  const rows = areas.flatMap((area) => [
    { type: 'area' as const, area },
    ...area.groups.map((g) => ({ type: 'group' as const, group: g, areaName: area.name })),
  ]);

  return (
    <FlatList
      style={styles.root}
      data={rows}
      keyExtractor={(item, idx) =>
        item.type === 'area' ? `a-${item.area.id}` : `g-${item.group.id}-${idx}`
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
      ListEmptyComponent={
        <Text style={styles.empty}>尚無牧區資料。</Text>
      }
      renderItem={({ item }) => {
        if (item.type === 'area') {
          return (
            <View style={styles.areaHeader}>
              <Text style={styles.areaName}>{item.area.name}</Text>
              {item.area.description ? (
                <Text style={styles.areaDesc}>{item.area.description}</Text>
              ) : null}
            </View>
          );
        }
        return (
          <Pressable
            style={styles.card}
            onPress={() =>
              navigation.navigate('GroupDetail', { id: item.group.id })
            }
          >
            <Text style={styles.groupName}>{item.group.name}</Text>
            {item.group.meetingTime ? (
              <Text style={styles.meta}>時間：{item.group.meetingTime}</Text>
            ) : null}
            {item.group.meetingPlace ? (
              <Text style={styles.meta}>地點：{item.group.meetingPlace}</Text>
            ) : null}
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
  areaName: { fontSize: 18, fontWeight: '700', color: theme.color.ink },
  areaDesc: { fontSize: 13, color: theme.color.inkMuted, marginTop: 4 },
  card: {
    backgroundColor: theme.color.bgElevated,
    borderRadius: theme.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.color.border,
    marginBottom: 10,
  },
  groupName: { fontSize: 16, fontWeight: '600', color: theme.color.ink },
  meta: { fontSize: 13, color: theme.color.inkMuted, marginTop: 4 },
  empty: { textAlign: 'center', color: theme.color.inkMuted, marginTop: 40 },
  error: { color: theme.color.danger, marginBottom: 8 },
});
