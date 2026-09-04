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

type ChannelKey = 'sunday' | 'zone';

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
  channel?: ChannelKey;
  channelLabel?: string;
}

const CHANNELS: Array<{ key: ChannelKey; label: string }> = [
  { key: 'sunday', label: '主日崇拜' },
  { key: 'zone', label: '成二牧區專屬頻道' },
];

/**
 * 主日崇拜：教會主日頻道＋成二牧區專屬頻道，可切換。
 */
export default function LivestreamScreen() {
  const [channel, setChannel] = useState<ChannelKey>('sunday');
  const [video, setVideo] = useState<VideoInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (ch: ChannelKey) => {
    setError('');
    setLoading(true);
    try {
      const data = await api<VideoInfo>(`/livestream/latest?channel=${ch}`);
      setVideo(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '載入失敗');
      setVideo(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(channel);
  }, [channel, load]);

  const activeLabel =
    CHANNELS.find((c) => c.key === channel)?.label ?? '主日崇拜';

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      <View style={styles.seg}>
        {CHANNELS.map((c) => {
          const active = c.key === channel;
          return (
            <Pressable
              key={c.key}
              style={[styles.segItem, active && styles.segItemActive]}
              onPress={() => setChannel(c.key)}
            >
              <Text
                style={[styles.segText, active && styles.segTextActive]}
                numberOfLines={2}
              >
                {c.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.inlineCenter}>
          <ActivityIndicator />
        </View>
      ) : error || !video ? (
        <View style={styles.inlineCenter}>
          <Text style={styles.error}>{error || '尚無影片'}</Text>
          <Pressable style={styles.btn} onPress={() => load(channel)}>
            <Text style={styles.btnText}>重試</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {video.source === 'demo' ? (
            <Text style={styles.demoBadge}>
              暫無法嵌入影片，請點下方開啟頻道觀看
            </Text>
          ) : (
            <Text style={styles.channelHint}>
              {video.channelLabel ?? activeLabel} ·{' '}
              {video.isThisWeek ? '當週最新上架' : '近期最新上架'}
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
                    style={
                      { border: 0, width: '100%', height: '100%' } as object
                    }
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
              <Text style={styles.playHint}>
                點擊以 YouTube App／瀏覽器播放
              </Text>
              <Text style={styles.link}>{video.watchUrl}</Text>
            </Pressable>
          )}

          <Pressable
            style={styles.btn}
            onPress={() => Linking.openURL(video.watchUrl)}
          >
            <Text style={styles.btnText}>在 YouTube 開啟本集</Text>
          </Pressable>
          {video.channelUrl ? (
            <Pressable
              style={styles.ghostBtn}
              onPress={() => Linking.openURL(video.channelUrl!)}
            >
              <Text style={styles.ghostBtnText}>
                開啟頻道（更多{video.channelLabel ?? activeLabel}）
              </Text>
            </Pressable>
          ) : null}
        </>
      )}
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
  seg: {
    flexDirection: 'row',
    backgroundColor: theme.color.bgElevated,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.color.border,
    padding: 4,
    gap: 4,
  },
  segItem: {
    flex: 1,
    minHeight: theme.tapMin,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  segItemActive: {
    backgroundColor: theme.color.brandSoft,
  },
  segText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.color.inkMuted,
    textAlign: 'center',
  },
  segTextActive: {
    color: theme.color.brand,
  },
  inlineCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 40,
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
    alignSelf: 'stretch',
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
