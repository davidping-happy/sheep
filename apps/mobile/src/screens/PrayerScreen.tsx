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

interface GroupOption {
  id: string;
  name: string;
  areaName: string;
}

type Visibility = 'PRIVATE' | 'GROUP' | 'PUBLIC';

/**
 * 階段三代禱牆：私人／小組／公開、匿名、我已代禱、檢舉。
 * 公開內容需後台審核；私人對代禱同工可見。
 */
export default function PrayerScreen() {
  const [items, setItems] = useState<PrayerItem[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('PRIVATE');
  const [sharedGroupId, setSharedGroupId] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [posting, setPosting] = useState(false);
  const [info, setInfo] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const [data, areas] = await Promise.all([
        api<PrayerItem[]>('/prayer/feed'),
        api<{ id: string; name: string; groups: { id: string; name: string }[] }[]>(
          '/groups/areas',
        ),
      ]);
      setItems(data);
      const opts: GroupOption[] = [];
      for (const a of areas) {
        for (const g of a.groups ?? []) {
          opts.push({ id: g.id, name: g.name, areaName: a.name });
        }
      }
      setGroups(opts);
      if (!sharedGroupId && opts[0]) setSharedGroupId(opts[0].id);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '載入失敗');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sharedGroupId]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit() {
    if (!content.trim()) return;
    if (visibility === 'GROUP' && !sharedGroupId) {
      setError('請選擇要分享的小組');
      return;
    }
    setPosting(true);
    setInfo('');
    setError('');
    try {
      const created = await api<PrayerItem>('/prayer', {
        method: 'POST',
        body: JSON.stringify({
          content: content.trim(),
          visibility,
          isAnonymous,
          ...(visibility === 'GROUP' ? { sharedGroupId } : {}),
        }),
      });
      setContent('');
      if (created.moderationStatus === 'PENDING') {
        setInfo('已送出，公開內容需同工審核後才會顯示給其他人。');
      } else if (created.moderationStatus === 'AUTO_FLAGGED') {
        setInfo('已標記需關懷同工處理，不會公開曝光。');
      } else {
        setInfo(
          visibility === 'PRIVATE'
            ? '已發布（私人：僅你與代禱同工可見）。'
            : '已發布。',
        );
      }
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '發布失敗');
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
      setError(e instanceof ApiError ? e.message : '下架失敗');
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
      setError(e instanceof ApiError ? e.message : '操作失敗');
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
      setError(e instanceof ApiError ? e.message : '檢舉失敗');
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
          {(['PRIVATE', 'GROUP', 'PUBLIC'] as Visibility[]).map((v) => (
            <Pressable
              key={v}
              style={[styles.chip, visibility === v && styles.chipOn]}
              onPress={() => setVisibility(v)}
            >
              <Text
                style={[styles.chipText, visibility === v && styles.chipTextOn]}
              >
                {v === 'PRIVATE'
                  ? '私人'
                  : v === 'GROUP'
                    ? '小組'
                    : '公開（需審核）'}
              </Text>
            </Pressable>
          ))}
          <Pressable
            style={[styles.chip, isAnonymous && styles.chipOn]}
            onPress={() => setIsAnonymous((x) => !x)}
          >
            <Text
              style={[styles.chipText, isAnonymous && styles.chipTextOn]}
            >
              匿名
            </Text>
          </Pressable>
        </View>
        {visibility === 'GROUP' ? (
          <View style={styles.row}>
            {groups.length === 0 ? (
              <Text style={styles.metaHint}>
                尚未加入小組，請先向同工申請入組。
              </Text>
            ) : (
              groups.map((g) => (
                <Pressable
                  key={g.id}
                  style={[
                    styles.chip,
                    sharedGroupId === g.id && styles.chipOn,
                  ]}
                  onPress={() => setSharedGroupId(g.id)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      sharedGroupId === g.id && styles.chipTextOn,
                    ]}
                  >
                    {g.areaName}/{g.name}
                  </Text>
                </Pressable>
              ))
            )}
          </View>
        ) : null}
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
