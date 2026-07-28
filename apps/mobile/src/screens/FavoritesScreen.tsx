import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { FEATURES, FeatureIcon } from '../features';
import type { MainTabParamList } from '../navigation/types';
import { theme } from '../theme';

/** 常用捷徑 — 快速進入核心功能 */
export default function FavoritesScreen() {
  const navigation = useNavigation<NavigationProp<MainTabParamList>>();
  const favorites = FEATURES.filter((f) =>
    ['Livestream', 'Devotions', 'Prayer', 'Announcements'].includes(f.key),
  );

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.pad}>
      <Text style={styles.h1}>我的最愛</Text>
      <Text style={styles.sub}>常用功能捷徑，一鍵進入</Text>

      <View style={styles.grid}>
        {favorites.map((f) => (
          <Pressable
            key={f.key}
            style={({ pressed }) => [styles.tile, pressed && { opacity: 0.85 }]}
            onPress={() =>
              navigation.navigate('HomeTab', {
                screen: f.key,
              })
            }
          >
            <View style={[styles.circle, { backgroundColor: f.color }]}>
              <FeatureIcon
                family={f.family}
                name={f.icon}
                color="#fff"
                size={26}
              />
            </View>
            <Text style={styles.tileTitle}>{f.title}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.hint}>
        <Ionicons name="heart" size={18} color={theme.color.brand} />
        <Text style={styles.hintText}>
          之後可自訂收藏項目；目前先放牧區最常用的四項。
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.bg },
  pad: { padding: 20, paddingBottom: 40 },
  h1: { fontSize: 26, fontWeight: '700', color: theme.color.ink },
  sub: {
    fontSize: 14,
    color: theme.color.inkMuted,
    marginTop: 4,
    marginBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  tile: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.color.border,
    paddingVertical: 20,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 10,
  },
  circle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.color.ink,
    textAlign: 'center',
  },
  hint: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 24,
    padding: 14,
    backgroundColor: theme.color.brandSoft,
    borderRadius: 12,
    alignItems: 'flex-start',
  },
  hintText: {
    flex: 1,
    fontSize: 13,
    color: theme.color.inkMuted,
    lineHeight: 20,
  },
});
