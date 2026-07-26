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

interface GroupDetail {
  id: string;
  name: string;
  intro: string | null;
  meetingTime: string | null;
  meetingPlace: string | null;
  contactVisible: boolean;
  leader: { id: string; displayName: string } | null;
  pastoralArea: { id: string; name: string };
}

type Props = NativeStackScreenProps<RootStackParamList, 'GroupDetail'>;

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
    <ScrollView contentContainerStyle={styles.container}>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 20, gap: 12 },
  area: { fontSize: 13, color: '#4f46e5', fontWeight: '600' },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  intro: { fontSize: 16, lineHeight: 26, color: '#374151', marginVertical: 8 },
  block: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  label: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  value: { fontSize: 16, color: '#111827' },
  note: { fontSize: 12, color: '#9ca3af', marginTop: 8 },
  error: { color: '#dc2626' },
});
