import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FEATURES, FeatureIcon } from '../features';
import { theme } from '../theme';
import type { HomeStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'HomeMain'>;

export default function HomeScreen({ navigation }: Props) {
  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.container}
    >
      <Image
        source={require('../../assets/brand/home-banner.png')}
        style={styles.banner}
        resizeMode="cover"
      />

      <View style={styles.brandBlock}>
        <Text style={styles.hero}>{theme.brandName}</Text>
        <Text style={styles.heroSub}>{theme.tagline}</Text>
      </View>

      <View style={styles.list}>
        {FEATURES.map((f) => (
          <Pressable
            key={f.key}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
            onPress={() => navigation.navigate(f.key as never)}
          >
            <View style={[styles.iconCircle, { backgroundColor: f.color }]}>
              <FeatureIcon
                family={f.family}
                name={f.icon}
                color="#fff"
                size={22}
              />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.title}>{f.title}</Text>
              <Text style={styles.desc}>{f.desc}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.bg },
  container: { paddingBottom: 24 },
  banner: {
    width: '100%',
    height: 168,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  brandBlock: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  hero: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.color.ink,
  },
  heroSub: {
    fontSize: 15,
    color: theme.color.secondary,
    marginTop: 4,
  },
  list: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.color.border,
    overflow: 'hidden',
  },
  row: {
    minHeight: 72,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.color.border,
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: 2 },
  title: { fontSize: 16, fontWeight: '700', color: theme.color.ink },
  desc: { fontSize: 12, color: theme.color.inkMuted },
  chevron: { fontSize: 24, color: theme.color.brand, paddingLeft: 4 },
});
