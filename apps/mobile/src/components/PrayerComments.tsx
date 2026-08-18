import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { api } from '../lib/api';
import { theme } from '../theme';

interface CommentItem {
  id: string;
  content: string;
  authorDisplay: string;
  isOwner: boolean;
  canDelete: boolean;
  createdAt: string;
}

interface Props {
  prayerId: string;
  /** 由列表帶入的初始留言數；展開後改由本元件維護 */
  count: number;
  onError: (e: unknown, fallback: string) => void | Promise<void>;
}

/**
 * 代禱事項底下的回應留言。預設收合，點開才向 API 取留言。
 * 「回覆」以 @暱稱 帶入輸入框（單層討論，不做巢狀）。
 */
export function PrayerComments({ prayerId, count, onError }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<CommentItem[]>([]);
  const [total, setTotal] = useState(count);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<CommentItem[]>(`/prayer/${prayerId}/comments`);
      setItems(data);
      setTotal(data.length);
    } catch (e) {
      await onError(e, '載入留言失敗');
    } finally {
      setLoading(false);
    }
  }, [prayerId, onError]);

  // 列表重新整理帶回新的留言數時才覆蓋，避免蓋掉剛送出／刪除的即時結果
  const lastCount = useRef(count);
  useEffect(() => {
    if (lastCount.current !== count) {
      lastCount.current = count;
      setTotal(count);
    }
  }, [count]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) await load();
  }

  async function submit() {
    const content = draft.trim();
    if (!content || posting) return;
    setPosting(true);
    try {
      const created = await api<CommentItem>(`/prayer/${prayerId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
      setItems((prev) => [...prev, created]);
      setTotal((n) => n + 1);
      setDraft('');
    } catch (e) {
      await onError(e, '留言失敗');
    } finally {
      setPosting(false);
    }
  }

  async function remove(id: string) {
    setBusyId(id);
    try {
      await api(`/prayer/comments/${id}/delete`, { method: 'POST' });
      setItems((prev) => prev.filter((c) => c.id !== id));
      setTotal((n) => Math.max(0, n - 1));
    } catch (e) {
      await onError(e, '刪除留言失敗');
    } finally {
      setBusyId(null);
    }
  }

  function reply(item: CommentItem) {
    if (item.isOwner) {
      inputRef.current?.focus();
      return;
    }
    setDraft((prev) =>
      prev.startsWith(`@${item.authorDisplay}`)
        ? prev
        : `@${item.authorDisplay} ${prev}`.trimEnd() + ' ',
    );
    inputRef.current?.focus();
  }

  return (
    <View style={styles.root}>
      <Pressable onPress={toggle} hitSlop={8} style={styles.toggleRow}>
        <Text style={styles.toggle}>
          {open ? '收合留言' : `留言・回應（${total}）`}
        </Text>
      </Pressable>

      {open ? (
        <View style={styles.panel}>
          {loading ? <ActivityIndicator /> : null}
          {!loading && items.length === 0 ? (
            <Text style={styles.empty}>還沒有人留言，成為第一個鼓勵的人。</Text>
          ) : null}

          {items.map((c) => (
            <View key={c.id} style={styles.comment}>
              <View style={styles.commentHead}>
                <Text style={styles.commentAuthor}>{c.authorDisplay}</Text>
                <Text style={styles.commentTime}>
                  {new Date(c.createdAt).toLocaleString()}
                </Text>
              </View>
              <Text style={styles.commentBody}>{c.content}</Text>
              <View style={styles.commentActions}>
                <Pressable hitSlop={8} onPress={() => reply(c)}>
                  <Text style={styles.actionMuted}>回覆</Text>
                </Pressable>
                {c.canDelete ? (
                  <Pressable
                    hitSlop={8}
                    disabled={busyId === c.id}
                    onPress={() => remove(c.id)}
                  >
                    <Text style={styles.actionDanger}>刪除</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ))}

          <View style={styles.composer}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="寫下鼓勵或回應…"
              placeholderTextColor={theme.color.inkMuted}
              value={draft}
              onChangeText={setDraft}
              multiline
              maxLength={500}
            />
            <Pressable
              style={[
                styles.sendBtn,
                (posting || !draft.trim()) && styles.sendBtnOff,
              ]}
              onPress={submit}
              disabled={posting || !draft.trim()}
            >
              <Text style={styles.sendBtnText}>
                {posting ? '送出中…' : '送出'}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { marginTop: 10 },
  toggleRow: { paddingVertical: 4 },
  toggle: { fontSize: 13, color: theme.color.brand, fontWeight: '600' },
  panel: {
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: theme.color.border,
    paddingTop: 10,
    gap: 10,
  },
  empty: { fontSize: 13, color: theme.color.inkMuted },
  comment: {
    backgroundColor: theme.color.bg,
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  commentHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  commentAuthor: { fontSize: 13, fontWeight: '600', color: theme.color.ink },
  commentTime: { fontSize: 11, color: theme.color.inkMuted },
  commentBody: { fontSize: 14, lineHeight: 20, color: theme.color.ink },
  commentActions: { flexDirection: 'row', gap: 16, marginTop: 2 },
  actionMuted: { fontSize: 12, color: theme.color.inkMuted },
  actionDanger: { fontSize: 12, color: theme.color.danger },
  composer: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.color.ink,
    backgroundColor: theme.color.bgElevated,
  },
  sendBtn: {
    backgroundColor: theme.color.brand,
    borderRadius: 10,
    paddingHorizontal: 16,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnOff: { opacity: 0.5 },
  sendBtnText: { color: theme.color.brandInk, fontWeight: '600', fontSize: 14 },
});
