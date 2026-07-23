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

interface PrayerItem {
  id: string;
  content: string;
  visibility: string;
  moderationStatus: string;
  isAnonymous: boolean;
  authorDisplay?: string;
  authorId: string | null;
  sensitiveCategory: string;
  escalated: boolean;
  createdAt: string;
}

type Visibility = 'PRIVATE' | 'GROUP' | 'PUBLIC';

/**
 * 代禱牆：瀏覽 feed、發布（預設私人）、可選公開／匿名。
 * 公開內容需後台審核後才會出現在他人 feed。
 */
export default function PrayerScreen() {
  const [items, setItems] = useState<PrayerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('PRIVATE');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [posting, setPosting] = useState(false);
  const [info, setInfo] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await api<PrayerItem[]>('/prayer/feed');
      setItems(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '載入失敗');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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
          isAnonymous,
        }),
      });
      setContent('');
      if (created.moderationStatus === 'PENDING') {
        setInfo('已送出，公開內容需同工審核後才會顯示給其他人。');
      } else if (created.moderationStatus === 'AUTO_FLAGGED') {
        setInfo('已標記需關懷同工處理，不會公開曝光。');
      } else {
        setInfo('已發布。');
      }
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '發布失敗');
    } finally {
      setPosting(false);
    }
  }

  async function takeDown(id: string) {
    try {
      await api(`/prayer/${id}/takedown`, { method: 'POST' });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '下架失敗');
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
              <Text style={[styles.chipText, visibility === v && styles.chipTextOn]}>
                {v === 'PRIVATE' ? '私人' : '公開（需審核）'}
              </Text>
            </Pressable>
          ))}
          <Pressable
            style={[styles.chip, isAnonymous && styles.chipOn]}
            onPress={() => setIsAnonymous((x) => !x)}
          >
            <Text style={[styles.chipText, isAnonymous && styles.chipTextOn]}>
              匿名
            </Text>
          </Pressable>
        </View>
        <Pressable
          style={[styles.postBtn, posting && { opacity: 0.6 }]}
          onPress={submit}
          disabled={posting}
        >
          <Text style={styles.postBtnText}>{posting ? '送出中…' : '發布'}</Text>
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
          <Text style={styles.empty}>尚無代禱事項。發布一則，或下拉重新整理。</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.meta}>
              <Text style={styles.author}>
                {item.isAnonymous
                  ? item.authorDisplay ?? '一位弟兄姊妹'
                  : '會友'}
              </Text>
              <Text style={styles.badge}>{visLabel(item.visibility)}</Text>
              {item.moderationStatus !== 'APPROVED' ? (
                <Text style={styles.badgeWarn}>{item.moderationStatus}</Text>
              ) : null}
            </View>
            <Text style={styles.body}>{item.content}</Text>
            <View style={styles.footer}>
              <Text style={styles.time}>
                {new Date(item.createdAt).toLocaleString()}
              </Text>
              {item.authorId ? (
                <Pressable onPress={() => takeDown(item.id)}>
                  <Text style={styles.takedown}>下架</Text>
                </Pressable>
              ) : null}
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
  root: { flex: 1, backgroundColor: '#f6f5f0' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  compose: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 10,
  },
  composeTitle: { fontSize: 15, fontWeight: '600' },
  textarea: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  chipOn: { backgroundColor: '#eef2ff', borderColor: '#4f46e5' },
  chipText: { fontSize: 13, color: '#4b5563' },
  chipTextOn: { color: '#4f46e5', fontWeight: '600' },
  postBtn: {
    backgroundColor: '#4f46e5',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  postBtnText: { color: '#fff', fontWeight: '600' },
  info: { fontSize: 13, color: '#047857' },
  error: { fontSize: 13, color: '#dc2626' },
  list: { padding: 16, gap: 12, paddingBottom: 40 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 24 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 10,
  },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  author: { fontSize: 13, fontWeight: '600', color: '#374151' },
  badge: {
    fontSize: 11,
    color: '#4f46e5',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
  },
  badgeWarn: {
    fontSize: 11,
    color: '#92400e',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
  },
  body: { fontSize: 15, lineHeight: 22, color: '#1f2937' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    alignItems: 'center',
  },
  time: { fontSize: 12, color: '#9ca3af' },
  takedown: { fontSize: 13, color: '#dc2626' },
});
