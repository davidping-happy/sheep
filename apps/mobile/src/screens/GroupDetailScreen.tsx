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

interface GroupDetail {
  id: string;
  name: string;
  intro: string | null;
  photoUrl?: string | null;
  meetingTime: string | null;
  meetingPlace: string | null;
  contactVisible: boolean;
  leader: { id: string; displayName: string } | null;
  pastoralArea: { id: string; name: string };
}

type Props = NativeStackScreenProps<HomeStackParamList, 'GroupDetail'>;

export default function GroupDetailScreen({ route }: Props) {
  const { id } = route.params;
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await api<GroupDetail>(`/groups/${id}`);
      setGroup(data);
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
  if (error || !group) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error || '找不到小組'}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      <RemoteImage uri={group.photoUrl} style={styles.photo} />
      <Text style={styles.area}>{group.pastoralArea.name}</Text>
      <Text style={styles.title}>{group.name}</Text>
      {group.intro ? <Text style={styles.intro}>{group.intro}</Text> : null}
      <View style={styles.block}>
        <Text style={styles.label}>聚會時間</Text>
        <Text style={styles.value}>{group.meetingTime ?? '詳洽同工'}</Text>
      </View>
      <View style={styles.block}>
        <Text style={styles.label}>聚會地點</Text>
        <Text style={styles.value}>{group.meetingPlace ?? '詳洽同工'}</Text>
      </View>
      <View style={styles.block}>
        <Text style={styles.label}>小組長</Text>
        <Text style={styles.value}>
          {group.leader?.displayName ?? '即將更新'}
        </Text>
      </View>
      {!group.contactVisible ? (
        <Text style={styles.note}>
          聯絡方式未公開（需當事人同意才揭露，個資法蒐集最小化）。
        </Text>
      ) : null}
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
  },
  photo: {
    width: '100%',
    height: 200,
    borderRadius: theme.radius.md,
  },
  area: { fontSize: 13, color: theme.color.brand, fontWeight: '600' },
  title: { fontSize: 24, fontWeight: '700', color: theme.color.ink },
  intro: {
    fontSize: 16,
    lineHeight: 26,
    color: theme.color.ink,
    marginVertical: 8,
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
  note: { fontSize: 12, color: theme.color.inkMuted, marginTop: 8 },
  error: { color: theme.color.danger },
});
