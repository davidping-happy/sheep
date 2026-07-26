import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { api, ApiError } from '../lib/api';

interface VideoInfo {
  videoId: string;
  title: string;
  publishedAt: string;
  embedUrl: string;
  watchUrl: string;
  thumbnailUrl?: string;
  source: 'youtube' | 'demo';
}

/**
 * 主日崇拜：顯示最新 YouTube 影片。
 * 網頁用 iframe；原生用開啟 YouTube（避免強制依賴 webview 套件）。
 */
export default function LivestreamScreen() {
  const [video, setVideo] = useState<VideoInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const data = await api<VideoInfo>('/livestream/latest');
      setVideo(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '載入失敗');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error || !video) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error || '尚無影片'}</Text>
        <Pressable style={styles.btn} onPress={load}>
          <Text style={styles.btnText}>重試</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {video.source === 'demo' ? (
        <Text style={styles.demoBadge}>
          示範影片（請在 API .env 設定 YOUTUBE_API_KEY / YOUTUBE_CHANNEL_ID）
        </Text>
      ) : null}
      <Text style={styles.title}>{video.title}</Text>
      <Text style={styles.meta}>
        {new Date(video.publishedAt).toLocaleString()}
      </Text>

      {Platform.OS === 'web' ? (
        <View style={styles.player}>
          {typeof document !== 'undefined' ? (
            // web iframe（Expo Web）
            <View style={{ flex: 1 }}>
              {/* eslint-disable-next-line react/no-unknown-property */}
              <iframe
                src={video.embedUrl}
                title={video.title}
                style={{ border: 0, width: '100%', height: '100%' } as object}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </View>
          ) : null}
        </View>
      ) : (
        <Pressable
          style={styles.thumbBox}
          onPress={() => Linking.openURL(video.watchUrl)}
        >
          <Text style={styles.playHint}>點擊以 YouTube App／瀏覽器播放</Text>
          <Text style={styles.link}>{video.watchUrl}</Text>
        </Pressable>
      )}

      <Pressable style={styles.btn} onPress={() => Linking.openURL(video.watchUrl)}>
        <Text style={styles.btnText}>在 YouTube 開啟</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  demoBadge: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    padding: 10,
    borderRadius: 8,
    fontSize: 13,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#1f2937' },
  meta: { fontSize: 13, color: '#6b7280' },
  player: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
  },
  thumbBox: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 24,
    gap: 8,
  },
  playHint: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { color: '#a5b4fc', fontSize: 12 },
  btn: {
    backgroundColor: '#4f46e5',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '600' },
  error: { color: '#dc2626' },
});
