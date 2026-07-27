import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { theme } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const FEATURES: {
  key: keyof RootStackParamList;
  title: string;
  desc: string;
}[] = [
  { key: 'Livestream', title: '主日崇拜', desc: '一起敬拜・直播／回放' },
  { key: 'Prayer', title: '禱告代禱牆', desc: '彼此守望・關懷代禱' },
  { key: 'Events', title: '活動報名簽到', desc: '聚會報名・現場簽到' },
  { key: 'Devotions', title: '晨禱靈修筆記', desc: '每日與主親近' },
  { key: 'Articles', title: '靈修佳文', desc: '每日靈糧・牧者專欄' },
  { key: 'Groups', title: '牧區・小組', desc: '認識我們的小組家庭' },
  { key: 'Announcements', title: '最新資訊', desc: '牧區公告與提醒' },
];

export default function HomeScreen({ navigation }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.hero}>{theme.brandName}</Text>
      <Text style={styles.heroSub}>{theme.tagline}</Text>
      <View style={styles.list}>
        {FEATURES.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={styles.row}
            onPress={() => navigation.navigate(f.key as never)}
            activeOpacity={0.7}
          >
            <View style={styles.rowText}>
              <Text style={styles.title}>{f.title}</Text>
              <Text style={styles.desc}>{f.desc}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: theme.space.md,
    paddingBottom: 40,
    backgroundColor: theme.color.bg,
    flexGrow: 1,
  },
  hero: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.color.ink,
    marginTop: 8,
  },
  heroSub: {
    fontSize: 15,
    color: theme.color.secondary,
    marginBottom: theme.space.lg,
    marginTop: 4,
  },
  list: {
    backgroundColor: theme.color.bgElevated,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.color.border,
    overflow: 'hidden',
  },
  row: {
    minHeight: 64,
    paddingHorizontal: theme.space.md,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.color.border,
  },
  rowText: { flex: 1, gap: 2 },
  title: { fontSize: 17, fontWeight: '600', color: theme.color.ink },
  desc: { fontSize: 13, color: theme.color.inkMuted },
  chevron: { fontSize: 22, color: theme.color.brand, paddingLeft: 8 },
});
