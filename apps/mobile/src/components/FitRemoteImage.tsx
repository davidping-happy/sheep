import { useEffect, useState } from 'react';
import {
  Image,
  StyleSheet,
  View,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { resolveMediaUrl } from '../lib/media';
import { theme } from '../theme';

type Props = {
  uri?: string | null;
  /** 外層寬度（預設撐滿父層） */
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  maxHeight?: number;
};

/**
 * 依原圖比例自動調整高度，resizeMode=contain，避免裁切。
 */
export function FitRemoteImage({
  uri,
  style,
  imageStyle,
  maxHeight = 480,
}: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [ratio, setRatio] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    setRatio(null);
    resolveMediaUrl(uri).then((u) => {
      if (!alive) return;
      setSrc(u);
      if (!u) {
        setRatio(null);
        return;
      }
      Image.getSize(
        u,
        (w, h) => {
          if (!alive || !w || !h) return;
          setRatio(w / h);
        },
        () => {
          if (alive) setRatio(16 / 9);
        },
      );
    });
    return () => {
      alive = false;
    };
  }, [uri]);

  if (!src) return null;

  return (
    <View style={[styles.wrap, style, ratio ? { aspectRatio: ratio, maxHeight } : { height: 160 }]}>
      <Image
        source={{ uri: src }}
        style={[styles.img, imageStyle]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    backgroundColor: theme.color.bgElevated,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
  },
  img: {
    width: '100%',
    height: '100%',
  },
});
