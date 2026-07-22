import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const FEATURES: { key: keyof RootStackParamList; title: string; desc: string }[] = [
  { key: 'Devotions', title: '晨禱靈修筆記', desc: '每日個人筆記・雲端同步（預設私人）' },
  { key: 'Livestream', title: '主日崇拜', desc: 'YouTube 直播/回放' },
  { key: 'Articles', title: '靈修佳文', desc: '每日靈糧・牧者專欄' },
  { key: 'Groups', title: '牧區・小組', desc: '小組介紹與聚會資訊' },
  { key: 'Announcements', title: '最新資訊', desc: '公告與推播' },
  { key: 'Events', title: '活動報名簽到', desc: '報名活動・現場掃碼簽到' },
  { key: 'Prayer', title: '禱告代禱牆', desc: '發布/瀏覽代禱事項（隱私分級）' },
];

export default function HomeScreen({ navigation }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      {FEATURES.map((f) => (
        <TouchableOpacity
          key={f.key}
          style={styles.card}
          onPress={() => navigation.navigate(f.key)}
        >
          <Text style={styles.title}>{f.title}</Text>
          <Text style={styles.desc}>{f.desc}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  title: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  desc: { fontSize: 13, color: '#6b7280' },
});
