import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { FitRemoteImage } from './FitRemoteImage';
import { theme } from '../theme';

type Props = {
  urls?: string[] | null;
  coverUrl?: string | null;
  /** @deprecated 保留相容；完整呈現時以原圖比例為準 */
  height?: number;
  maxHeight?: number;
};

/** 橫向多圖；單圖／多圖皆 contain，不裁切 */
export function ImageGallery({
  urls,
  coverUrl,
  height,
  maxHeight,
}: Props) {
  const mh = maxHeight ?? height ?? 360;
  const { width: winW } = useWindowDimensions();
  const list =
    urls && urls.length > 0
      ? urls.filter(Boolean)
      : coverUrl
        ? [coverUrl]
        : [];
  if (list.length === 0) return null;
  if (list.length === 1) {
    return (
      <FitRemoteImage
        uri={list[0]}
        maxHeight={mh}
        style={styles.single}
      />
    );
  }
  const slideW = Math.min(winW - 48, 280);
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {list.map((u) => (
        <View key={u} style={{ width: slideW }}>
          <FitRemoteImage uri={u} maxHeight={mh} />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  single: {
    marginBottom: 12,
  },
  row: { gap: 10, paddingBottom: 4, marginBottom: 8 },
});
