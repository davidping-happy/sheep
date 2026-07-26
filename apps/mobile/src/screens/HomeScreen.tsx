import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const FEATURES: {
  key: keyof RootStackParamList;
  title: string;
  desc: string;
  phase: 1 | 2;
}[] = [
  { key: 'Livestream', title: '主日崇拜', desc: 'YouTube 直播／回放', phase: 1 },
  { key: 'Articles', title: '靈修佳文', desc: '每日靈糧・牧者專欄', phase: 1 },
  { key: 'Groups', title: '牧區・小組', desc: '小組介紹與聚會資訊', phase: 1 },
  { key: 'Announcements', title: '最新資訊', desc: '公告與推播', phase: 1 },
  { key: 'Prayer', title: '禱告代禱牆', desc: '發布／瀏覽代禱', phase: 2 },
  { key: 'Events', title: '活動報名簽到', desc: '報名・簽到', phase: 2 },
  { key: 'Devotions', title: '晨禱靈修筆記', desc: '個人筆記（階段二）', phase: 2 },
];

export default function HomeScreen({ navigation }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.hero}>第一階段 MVP</Text>
      <Text style={styles.heroSub}>帳號・主日崇拜・佳文・小組・公告</Text>
      {FEATURES.map((f) => (
        <TouchableOpacity
          key={f.key}
          style={[styles.card, f.phase === 1 && styles.cardReady]}
          onPress={() => navigation.navigate(f.key as never)}
        >
          <Text style={styles.title}>
            {f.title}
            {f.phase === 1 ? '  ✓' : ''}
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
  desc: { fontSize: 13, color: '#6b7280' },
});
