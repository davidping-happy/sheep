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
import { theme } from '../theme';

interface VideoInfo {
  videoId: string;
  title: string;
  publishedAt: string;
  embedUrl: string;
  watchUrl: string;
  thumbnailUrl?: string;
  source: 'youtube' | 'demo';
  channelUrl?: string;
  isThisWeek?: boolean;
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
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      {video.source === 'demo' ? (
        <Text style={styles.demoBadge}>
          暫無法嵌入影片，請點下方開啟頻道觀看主日信息
        </Text>
      ) : (
        <Text style={styles.channelHint}>
          高雄靈糧堂 · {video.isThisWeek ? '當週最新上架' : '近期最新上架'}
        </Text>
      )}
      <Text style={styles.title}>{video.title}</Text>
      <Text style={styles.meta}>
        {new Date(video.publishedAt).toLocaleString()}
      </Text>

      {Platform.OS === 'web' && video.videoId ? (
        <View style={styles.player}>
          {typeof document !== 'undefined' ? (
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
        <Text style={styles.btnText}>在 YouTube 開啟本集</Text>
      </Pressable>
      {video.channelUrl ? (
        <Pressable
          style={styles.ghostBtn}
          onPress={() => Linking.openURL(video.channelUrl!)}
        >
          <Text style={styles.ghostBtnText}>開啟頻道（更多主日信息）</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.bg },
  container: {
    padding: 16,
    gap: 12,
    backgroundColor: theme.color.bg,
    flexGrow: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: theme.color.bg,
  },
  demoBadge: {
    backgroundColor: theme.color.warnSoft,
    color: theme.color.warn,
    padding: 10,
    borderRadius: theme.radius.sm,
    fontSize: 13,
  },
  channelHint: {
    fontSize: 13,
    color: theme.color.secondary,
    fontWeight: '600',
  },
  title: { fontSize: 18, fontWeight: '700', color: theme.color.ink },
  meta: { fontSize: 13, color: theme.color.inkMuted },
  player: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    borderRadius: theme.radius.md,
    overflow: 'hidden',
  },
  thumbBox: {
    backgroundColor: theme.color.ink,
    borderRadius: theme.radius.md,
    padding: 24,
    gap: 8,
  },
  playHint: { color: theme.color.brandInk, fontSize: 16, fontWeight: '600' },
  link: { color: theme.color.brandSoft, fontSize: 12 },
  btn: {
    backgroundColor: theme.color.brand,
    borderRadius: theme.radius.sm,
    paddingVertical: 12,
    minHeight: theme.tapMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: theme.color.brandInk, fontWeight: '600' },
  ghostBtn: {
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.sm,
    paddingVertical: 12,
    minHeight: theme.tapMin,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.bgElevated,
  },
  ghostBtnText: { color: theme.color.brand, fontWeight: '600' },
  error: { color: theme.color.danger },
});
