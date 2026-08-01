import { useEffect, useState } from 'react';
import { Image, StyleSheet, type ImageStyle, type StyleProp } from 'react-native';
import { resolveMediaUrl } from '../lib/media';

type Props = {
  uri?: string | null;
  style?: StyleProp<ImageStyle>;
};

/** 顯示後台上傳或外部網址圖片 */
export function RemoteImage({ uri, style }: Props) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    resolveMediaUrl(uri).then((u) => {
      if (alive) setSrc(u);
    });
    return () => {
      alive = false;
    };
  }, [uri]);

  if (!src) return null;
  return <Image source={{ uri: src }} style={[styles.img, style]} />;
}

const styles = StyleSheet.create({
  img: { width: '100%', backgroundColor: '#e8e4dc' },
});
