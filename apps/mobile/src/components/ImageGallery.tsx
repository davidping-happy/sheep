import { ScrollView, StyleSheet } from 'react-native';
import { RemoteImage } from './RemoteImage';
import { theme } from '../theme';

type Props = {
  urls?: string[] | null;
  coverUrl?: string | null;
  height?: number;
};

/** 橫向多圖（無圖時不顯示） */
export function ImageGallery({ urls, coverUrl, height = 200 }: Props) {
  const list =
    urls && urls.length > 0
      ? urls.filter(Boolean)
      : coverUrl
        ? [coverUrl]
        : [];
  if (list.length === 0) return null;
  if (list.length === 1) {
    return <RemoteImage uri={list[0]} style={[styles.single, { height }]} />;
  }
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {list.map((u) => (
        <RemoteImage
          key={u}
          uri={u}
          style={[styles.slide, { height, width: height * 1.4 }]}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  single: {
    width: '100%',
    borderRadius: theme.radius.md,
    marginBottom: 12,
  },
  row: { gap: 10, paddingBottom: 4, marginBottom: 8 },
  slide: {
    borderRadius: theme.radius.md,
  },
});
