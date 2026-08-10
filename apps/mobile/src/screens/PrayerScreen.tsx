import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { api, ApiError } from '../lib/api';
import { theme } from '../theme';

interface PrayerItem {
  id: string;
  content: string;
  visibility: string;
  moderationStatus: string;
  isAnonymous: boolean;
  authorDisplay?: string;
  authorId: string | null;
  isOwner?: boolean;
  sensitiveCategory: string;
  escalated: boolean;
  responseCount?: number;
  iPrayed?: boolean;
  createdAt: string;
}

type Visibility = 'PRIVATE' | 'PUBLIC';

/**
 * 代禱牆：私人／公開（需審核）、我已代禱、檢舉。
 * （已取消「小組」「匿名」選項）
 */
export default function PrayerScreen() {
  const { signOut } = useAuth();
  const [items, setItems] = useState<PrayerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('PRIVATE');
  const [posting, setPosting] = useState(false);
  const [info, setInfo] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleAuthError = useCallback(
    async (e: unknown, fallback: string) => {
      if (e instanceof ApiError && e.status === 401) {
        setError('登入已失效，請重新登入後再發布／查看代禱。');
        await signOut();
        return;
      }
      setError(e instanceof ApiError ? e.message : fallback);
    },
    [signOut],
  );

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await api<PrayerItem[]>('/prayer/feed');
      setItems(data);
    } catch (e) {
      await handleAuthError(e, '載入失敗');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [handleAuthError]);

  useEffect(() => {
    load();
  }, [load]);

  async function submit() {
    if (!content.trim()) return;
    setPosting(true);
    setInfo('');
    setError('');
    try {
      const created = await api<PrayerItem>('/prayer', {
        method: 'POST',
        body: JSON.stringify({
          content: content.trim(),
          visibility,
          isAnonymous: false,
        }),
      });
      setContent('');
      if (created.moderationStatus === 'PENDING') {
        setInfo('已送出，內容需同工審核後才會顯示給其他人。');
      } else if (created.moderationStatus === 'AUTO_FLAGGED') {
        setInfo('已標記需關懷同工處理，不會公開曝光。');
      } else {
        setInfo(
          visibility === 'PRIVATE'
            ? '已發布（私人：僅你與代禱同工可見）。'
            : '已公開發布。',
        );
      }
      await load();
    } catch (e) {
      await handleAuthError(e, '發布失敗');
    } finally {
      setPosting(false);
    }
  }

  async function takeDown(id: string) {
    setBusyId(id);
    try {
      await api(`/prayer/${id}/takedown`, { method: 'POST' });
      await load();
    } catch (e) {
      await handleAuthError(e, '下架失敗');
    } finally {
      setBusyId(null);
    }
  }

  async function respond(id: string) {
    setBusyId(id);
    try {
      await api(`/prayer/${id}/respond`, {
        method: 'POST',
        body: JSON.stringify({ showIdentity: false }),
      });
      setInfo('已記錄你的代禱。');
      await load();
    } catch (e) {
      await handleAuthError(e, '操作失敗');
    } finally {
      setBusyId(null);
    }
  }

  async function report(id: string) {
    setBusyId(id);
    try {
      await api(`/prayer/${id}/report`, {
        method: 'POST',
        body: JSON.stringify({ reason: '內容不當或不實' }),
      });
      setInfo('已送出檢舉，同工將複核。');
    } catch (e) {
      await handleAuthError(e, '檢舉失敗');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.compose}>
        <Text style={styles.composeTitle}>發布代禱事項</Text>
        <TextInput
          style={styles.textarea}
          placeholder="寫下你的代禱…（預設僅自己與代禱同工可見）"
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
        />
        <View style={styles.row}>
          {(['PRIVATE', 'PUBLIC'] as Visibility[]).map((v) => (
            <Pressable
              key={v}
              style={[styles.chip, visibility === v && styles.chipOn]}
              onPress={() => setVisibility(v)}
            >
              <Text
                style={[styles.chipText, visibility === v && styles.chipTextOn]}
              >
                {v === 'PRIVATE' ? '私人' : '公開'}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          style={[styles.postBtn, posting && { opacity: 0.6 }]}
          onPress={submit}
          disabled={posting}
        >
          <Text style={styles.postBtnText}>
            {posting ? '送出中…' : '發布'}
          </Text>
        </Pressable>
        {info ? <Text style={styles.info}>{info}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            尚無代禱事項。發布一則，或下拉重新整理。
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.meta}>
              <Text style={styles.author}>
                {item.isAnonymous
                  ? item.authorDisplay ?? '一位弟兄姊妹'
                  : item.authorDisplay ?? '會友'}
              </Text>
              <Text style={styles.badge}>{visLabel(item.visibility)}</Text>
              {item.moderationStatus !== 'APPROVED' ? (
                <Text style={styles.badgeWarn}>{item.moderationStatus}</Text>
              ) : null}
              {item.escalated ? (
                <Text style={styles.badgeDanger}>關懷中</Text>
              ) : null}
            </View>
            <Text style={styles.body}>{item.content}</Text>
            <Text style={styles.metaHint}>
              {item.responseCount ?? 0} 人已代禱
              {item.iPrayed ? ' · 你已代禱' : ''}
            </Text>
            <View style={styles.footer}>
              <Text style={styles.time}>
                {new Date(item.createdAt).toLocaleString()}
              </Text>
              <View style={styles.row}>
                {!item.iPrayed ? (
                  <Pressable
                    disabled={busyId === item.id}
                    onPress={() => respond(item.id)}
                  >
                    <Text style={styles.action}>我已代禱</Text>
                  </Pressable>
                ) : null}
                {!item.isOwner ? (
                  <Pressable
                    disabled={busyId === item.id}
                    onPress={() => report(item.id)}
                  >
                    <Text style={styles.actionMuted}>檢舉</Text>
                  </Pressable>
                ) : null}
                {item.isOwner ? (
                  <Pressable
                    disabled={busyId === item.id}
                    onPress={() => takeDown(item.id)}
                  >
                    <Text style={styles.takedown}>下架</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
}

function visLabel(v: string) {
  if (v === 'PRIVATE') return '私人';
  if (v === 'GROUP') return '小組';
  return '公開';
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  compose: {
    backgroundColor: theme.color.bgElevated,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.border,
    gap: 10,
  },
  composeTitle: { fontSize: 15, fontWeight: '600', color: theme.color.ink },
  textarea: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: theme.color.ink,
    backgroundColor: theme.color.bgElevated,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.color.border,
    backgroundColor: theme.color.bgElevated,
  },
  chipOn: { backgroundColor: theme.color.brandSoft, borderColor: theme.color.brand },
  chipText: { fontSize: 13, color: theme.color.inkMuted },
  chipTextOn: { color: theme.color.brand, fontWeight: '600' },
  postBtn: {
    backgroundColor: theme.color.brand,
    borderRadius: 10,
    paddingVertical: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postBtnText: { color: theme.color.brandInk, fontWeight: '600' },
  info: { fontSize: 13, color: theme.color.success },
  error: { fontSize: 13, color: theme.color.danger },
  list: { padding: 16, gap: 12, paddingBottom: 40 },
  empty: { textAlign: 'center', color: theme.color.inkMuted, marginTop: 24 },
  card: {
    backgroundColor: theme.color.bgElevated,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.color.border,
    marginBottom: 10,
  },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  author: { fontSize: 13, fontWeight: '600', color: theme.color.ink },
  badge: {
    fontSize: 11,
    color: theme.color.brand,
    backgroundColor: theme.color.brandSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
  },
  badgeWarn: {
    fontSize: 11,
    color: theme.color.warn,
    backgroundColor: '#FEF0C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
  },
  badgeDanger: {
    fontSize: 11,
    color: theme.color.danger,
    backgroundColor: '#FEE4E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
  },
  body: { fontSize: 15, lineHeight: 22, color: theme.color.ink },
  metaHint: { fontSize: 12, color: theme.color.inkMuted, marginTop: 6 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    alignItems: 'center',
  },
  time: { fontSize: 12, color: theme.color.inkMuted },
  action: { fontSize: 13, color: theme.color.brand, fontWeight: '600' },
  actionMuted: { fontSize: 13, color: theme.color.inkMuted },
  takedown: { fontSize: 13, color: theme.color.danger },
});
