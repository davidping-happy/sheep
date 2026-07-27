import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const FEATURES: {
  key: keyof RootStackParamList;
  title: string;
  desc: string;
  phase: 1 | 2 | 3;
}[] = [
  { key: 'Prayer', title: '禱告代禱牆', desc: '私人／小組／公開・審核・匿名', phase: 3 },
  { key: 'Events', title: '活動報名簽到', desc: '報名・動態 QR 簽到', phase: 3 },
  { key: 'Devotions', title: '晨禱靈修筆記', desc: '加密同步・預設私人', phase: 2 },
  { key: 'Livestream', title: '主日崇拜', desc: 'YouTube 直播／回放', phase: 1 },
  { key: 'Articles', title: '靈修佳文', desc: '每日靈糧・牧者專欄', phase: 1 },
  { key: 'Groups', title: '牧區・小組', desc: '小組介紹與聚會資訊', phase: 1 },
  { key: 'Announcements', title: '最新資訊', desc: '公告與分眾推播', phase: 1 },
];

export default function HomeScreen({ navigation }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.hero}>教會 APP</Text>
      <Text style={styles.heroSub}>階段一～三功能已開通（標 ✓）</Text>
      {FEATURES.map((f) => (
        <TouchableOpacity
          key={f.key}
          style={[styles.card, styles.cardReady]}
          onPress={() => navigation.navigate(f.key as never)}
        >
          <Text style={styles.title}>
            {f.title}  ✓
            <Text style={styles.phase}>  階段{f.phase}</Text>
          </Text>
          <Text style={styles.desc}>{f.desc}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 40 },
  hero: { fontSize: 20, fontWeight: '700', color: '#111827' },
  heroSub: { fontSize: 13, color: '#6b7280', marginBottom: 8 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardReady: { borderColor: '#4f46e5', backgroundColor: '#fafaff' },
  title: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  phase: { fontSize: 12, fontWeight: '400', color: '#9ca3af' },
  desc: { fontSize: 13, color: '#6b7280' },
});
