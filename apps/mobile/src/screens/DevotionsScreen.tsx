import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, ApiError } from '../lib/api';
import {
  exportDevotionDocx,
  exportDevotionPdf,
  shareDevotionText,
  type DevotionExportInput,
} from '../lib/devotion-export';
import { theme } from '../theme';

type DevotionCategory = 'SERMON' | 'MORNING_PRAYER' | 'DEVOTION';
type Visibility = 'PRIVATE' | 'PUBLIC' | 'GROUP';
type Tab = 'mine' | 'feed';

interface DevotionAuthor {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
}

interface DevotionNote {
  id: string;
  noteDate: string;
  category?: DevotionCategory | string | null;
  scriptureRef: string | null;
  content: string;
  visibility: string;
  createdAt: string;
  author?: DevotionAuthor;
  likeCount?: number;
  commentCount?: number;
  likedByMe?: boolean;
  isMine?: boolean;
}

interface DevotionComment {
  id: string;
  content: string;
  createdAt: string;
  author: DevotionAuthor;
  isMine: boolean;
}

const CONTENT_MAX = 800;
const COMMENT_MAX = 500;

const CATEGORIES: { value: DevotionCategory; label: string }[] = [
  { value: 'SERMON', label: '講道' },
  { value: 'MORNING_PRAYER', label: '晨禱' },
  { value: 'DEVOTION', label: '靈修' },
];

const VISIBILITIES: { value: Visibility; label: string; hint: string }[] = [
  { value: 'PRIVATE', label: '僅自己', hint: '加密私人筆記' },
  { value: 'PUBLIC', label: '牧區公開', hint: '動態牆可按讚留言' },
];

function categoryLabel(value?: string | null) {
  return CATEGORIES.find((c) => c.value === value)?.label ?? '靈修';
}

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

/**
 * 靈修隨記：私人筆記 + 牧區動態牆（按讚／留言）+ 對外分享（LINE／FB…）
 */
export default function DevotionsScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('mine');
  const [items, setItems] = useState<DevotionNote[]>([]);
  const [feed, setFeed] = useState<DevotionNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<DevotionNote | null>(null);
  const [noteDate, setNoteDate] = useState(todayISO());
  const [category, setCategory] = useState<DevotionCategory>('DEVOTION');
  const [visibility, setVisibility] = useState<Visibility>('PRIVATE');
  const [scriptureRef, setScriptureRef] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<
    DevotionCategory | 'ALL'
  >('ALL');
  const [shareTarget, setShareTarget] = useState<DevotionNote | null>(null);
  const [sharing, setSharing] = useState(false);
  const [commentNote, setCommentNote] = useState<DevotionNote | null>(null);
  const [comments, setComments] = useState<DevotionComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentSaving, setCommentSaving] = useState(false);

  const loadMine = useCallback(async () => {
    const data = await api<DevotionNote[]>('/devotions');
    setItems(data);
  }, []);

  const loadFeed = useCallback(async () => {
    const data = await api<DevotionNote[]>('/devotions/feed');
    setFeed(data);
  }, []);

  const load = useCallback(async () => {
    setError('');
    try {
      await Promise.all([loadMine(), loadFeed()]);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '載入失敗');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadMine, loadFeed]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setNoteDate(todayISO());
    setCategory('DEVOTION');
    setVisibility('PRIVATE');
    setScriptureRef('');
    setContent('');
    setModal(true);
  }

  function openEdit(n: DevotionNote) {
    if (tab === 'feed' && n.isMine === false) {
      openComments(n);
      return;
    }
    setEditing(n);
    setNoteDate(String(n.noteDate).slice(0, 10));
    setCategory(
      (CATEGORIES.find((c) => c.value === n.category)?.value as DevotionCategory) ??
        'DEVOTION',
    );
    setVisibility(
      n.visibility === 'PUBLIC'
        ? 'PUBLIC'
        : n.visibility === 'GROUP'
          ? 'PUBLIC'
          : 'PRIVATE',
    );
    setScriptureRef(n.scriptureRef ?? '');
    setContent(n.content);
    setModal(true);
  }

  async function save() {
    if (!content.trim()) return;
    if (content.trim().length > CONTENT_MAX) {
      setError(`筆記內容最多 ${CONTENT_MAX} 字`);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const body = {
        category,
        scriptureRef: scriptureRef || undefined,
        content: content.trim(),
        visibility,
      };
      if (editing) {
        await api(`/devotions/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
      } else {
        await api('/devotions', {
          method: 'POST',
          body: JSON.stringify({
            noteDate: new Date(noteDate).toISOString(),
            ...body,
          }),
        });
      }
      setModal(false);
      await load();
      if (visibility === 'PUBLIC') setTab('feed');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '儲存失敗');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(n: DevotionNote) {
    const run = async () => {
      try {
        await api(`/devotions/${n.id}`, { method: 'DELETE' });
        await load();
      } catch (e) {
        setError(e instanceof ApiError ? e.message : '刪除失敗');
      }
    };
    if (typeof window !== 'undefined' && window.confirm) {
      if (window.confirm('確定刪除此筆記？')) run();
    } else {
      Alert.alert('刪除筆記', '確定刪除此筆記？', [
        { text: '取消', style: 'cancel' },
        { text: '刪除', style: 'destructive', onPress: run },
      ]);
    }
  }

  function toExportInput(n: DevotionNote): DevotionExportInput {
    return {
      noteDate: n.noteDate,
      categoryLabel: categoryLabel(n.category),
      scriptureRef: n.scriptureRef,
      content: n.content,
      authorName: n.author?.displayName,
    };
  }

  function openShare(n: DevotionNote) {
    setShareTarget(n);
  }

  async function runShare(
    action: 'text' | 'pdf' | 'docx',
    n: DevotionNote,
  ) {
    setSharing(true);
    setError('');
    try {
      const input = toExportInput(n);
      if (action === 'text') await shareDevotionText(input);
      else if (action === 'pdf') await exportDevotionPdf(input);
      else await exportDevotionDocx(input);
      setShareTarget(null);
    } catch (e) {
      const msg =
        e instanceof Error && e.message
          ? e.message
          : '分享失敗，請稍後再試';
      setError(msg);
      if (Platform.OS !== 'web') {
        Alert.alert('分享失敗', msg);
      }
    } finally {
      setSharing(false);
    }
  }

  async function toggleLike(n: DevotionNote) {
    if (n.visibility === 'PRIVATE') {
      Alert.alert('提示', '請先將筆記設為「牧區公開」才能按讚');
      return;
    }
    try {
      const res = await api<{ liked: boolean; likeCount: number }>(
        `/devotions/${n.id}/like`,
        { method: 'POST' },
      );
      const patch = (list: DevotionNote[]) =>
        list.map((x) =>
          x.id === n.id
            ? { ...x, likedByMe: res.liked, likeCount: res.likeCount }
            : x,
        );
      setItems(patch);
      setFeed(patch);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '按讚失敗');
    }
  }

  async function openComments(n: DevotionNote) {
    if (n.visibility === 'PRIVATE') {
      Alert.alert('提示', '請先將筆記設為「牧區公開」才能留言');
      return;
    }
    setCommentNote(n);
    setCommentText('');
    setCommentLoading(true);
    try {
      const list = await api<DevotionComment[]>(`/devotions/${n.id}/comments`);
      setComments(list);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '載入留言失敗');
      setCommentNote(null);
    } finally {
      setCommentLoading(false);
    }
  }

  async function submitComment() {
    if (!commentNote || !commentText.trim()) return;
    setCommentSaving(true);
    try {
      const c = await api<DevotionComment>(
        `/devotions/${commentNote.id}/comments`,
        {
          method: 'POST',
          body: JSON.stringify({ content: commentText.trim() }),
        },
      );
      setComments((prev) => [...prev, c]);
      setCommentText('');
      const patch = (list: DevotionNote[]) =>
        list.map((x) =>
          x.id === commentNote.id
            ? { ...x, commentCount: (x.commentCount ?? 0) + 1 }
            : x,
        );
      setItems(patch);
      setFeed(patch);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '留言失敗');
    } finally {
      setCommentSaving(false);
    }
  }

  async function deleteComment(c: DevotionComment) {
    if (!commentNote) return;
    try {
      await api(`/devotions/comments/${c.id}`, { method: 'DELETE' });
      setComments((prev) => prev.filter((x) => x.id !== c.id));
      const patch = (list: DevotionNote[]) =>
        list.map((x) =>
          x.id === commentNote.id
            ? {
                ...x,
                commentCount: Math.max(0, (x.commentCount ?? 1) - 1),
              }
            : x,
        );
      setItems(patch);
      setFeed(patch);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '刪除留言失敗');
    }
  }

  const listSource = tab === 'mine' ? items : feed;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return listSource.filter((n) => {
      if (filterCategory !== 'ALL') {
        const cat = (n.category as DevotionCategory) || 'DEVOTION';
        if (cat !== filterCategory) return false;
      }
      if (!q) return true;
      const hay = [
        n.content,
        n.scriptureRef ?? '',
        n.author?.displayName ?? '',
        categoryLabel(n.category),
        String(n.noteDate).slice(0, 10),
      ]
        .join('\n')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [listSource, query, filterCategory]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  function renderActions(item: DevotionNote) {
    const canSocial = item.visibility === 'PUBLIC' || item.visibility === 'GROUP';
    return (
      <View style={styles.actionBar}>
        <Pressable
          style={styles.actionBtn}
          onPress={() => toggleLike(item)}
          disabled={!canSocial && tab === 'mine'}
        >
          <Ionicons
            name={item.likedByMe ? 'thumbs-up' : 'thumbs-up-outline'}
            size={18}
            color={item.likedByMe ? theme.color.brand : theme.color.inkMuted}
          />
          <Text
            style={[
              styles.actionText,
              item.likedByMe && { color: theme.color.brand },
            ]}
          >
            {item.likeCount ?? 0}
          </Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={() => openComments(item)}>
          <Ionicons
            name="chatbubble-outline"
            size={18}
            color={theme.color.inkMuted}
          />
          <Text style={styles.actionText}>{item.commentCount ?? 0}</Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={() => openShare(item)}>
          <Ionicons
            name="arrow-redo-outline"
            size={18}
            color={theme.color.inkMuted}
          />
          <Text style={styles.actionText}>分享</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.tabRow}>
        {(
          [
            { key: 'mine' as const, label: '我的筆記' },
            { key: 'feed' as const, label: '動態牆' },
          ] as const
        ).map((t) => {
          const active = tab === t.key;
          return (
            <Pressable
              key={t.key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setTab(t.key)}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.toolbar}>
        <Text style={styles.hint}>
          {tab === 'mine'
            ? '預設僅自己可見；可改「牧區公開」讓人按讚留言'
            : '牧區公開的靈修隨記，可按讚、留言或對外分享'}
        </Text>
        {tab === 'mine' ? (
          <Pressable style={styles.addBtn} onPress={openCreate}>
            <Text style={styles.addBtnText}>＋ 新筆記</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Ionicons
            name="search"
            size={18}
            color={theme.color.inkMuted}
            style={{ marginRight: 8 }}
          />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder={
              tab === 'mine'
                ? '搜尋過去筆記、經文、日期…'
                : '搜尋動態牆內容、作者…'
            }
            placeholderTextColor={theme.color.inkMuted}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={theme.color.inkMuted} />
            </Pressable>
          ) : null}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {(
            [
              { value: 'ALL' as const, label: '全部' },
              ...CATEGORIES,
            ] as { value: DevotionCategory | 'ALL'; label: string }[]
          ).map((c) => {
            const active = filterCategory === c.value;
            return (
              <Pressable
                key={c.value}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setFilterCategory(c.value)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    active && styles.filterChipTextActive,
                  ]}
                >
                  {c.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            {tab === 'mine'
              ? items.length === 0
                ? '尚無筆記，點右上角開始寫靈修隨記。'
                : '找不到符合的筆記。'
              : feed.length === 0
                ? '動態牆尚無公開筆記。把筆記設為「牧區公開」即可出現。'
                : '找不到符合的動態。'}
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Pressable
              onPress={() => {
                if (tab === 'mine' || item.isMine) openEdit(item);
                else openComments(item);
              }}
            >
              <View style={styles.row}>
                <View style={styles.meta}>
                  <Text style={styles.author}>
                    {item.author?.displayName ?? (item.isMine ? '我' : '會友')}
                  </Text>
                  <Text style={styles.date}>
                    {String(item.noteDate).slice(0, 10)}
                  </Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {categoryLabel(item.category)}
                    </Text>
                  </View>
                  {item.visibility === 'PUBLIC' ? (
                    <View style={[styles.badge, styles.badgePublic]}>
                      <Text style={styles.badgePublicText}>公開</Text>
                    </View>
                  ) : tab === 'mine' ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>私人</Text>
                    </View>
                  ) : null}
                </View>
                {tab === 'mine' ? (
                  <Pressable onPress={() => confirmDelete(item)} hitSlop={8}>
                    <Text style={styles.del}>刪除</Text>
                  </Pressable>
                ) : null}
              </View>
              {item.scriptureRef ? (
                <Text style={styles.ref}>{item.scriptureRef}</Text>
              ) : null}
              <Text style={styles.preview} numberOfLines={tab === 'feed' ? 8 : 3}>
                {item.content}
              </Text>
            </Pressable>
            {renderActions(item)}
          </View>
        )}
      />

      <Modal visible={modal} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View
            style={[
              styles.modal,
              { paddingBottom: Math.max(insets.bottom, 12) },
            ]}
          >
            <Text style={styles.modalTitle}>
              {editing ? '編輯靈修隨記' : '新增靈修隨記'}
            </Text>
            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={styles.modalBodyContent}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
              {!editing ? (
                <>
                  <Text style={styles.label}>日期 (YYYY-MM-DD)</Text>
                  <TextInput
                    style={styles.input}
                    value={noteDate}
                    onChangeText={setNoteDate}
                    placeholder="2026-07-26"
                  />
                </>
              ) : null}
              <Text style={styles.label}>分類</Text>
              <View style={styles.chips}>
                {CATEGORIES.map((c) => {
                  const active = category === c.value;
                  return (
                    <Pressable
                      key={c.value}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setCategory(c.value)}
                    >
                      <Text
                        style={[styles.chipText, active && styles.chipTextActive]}
                      >
                        {c.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.label}>誰可以看</Text>
              <View style={styles.chips}>
                {VISIBILITIES.map((v) => {
                  const active = visibility === v.value;
                  return (
                    <Pressable
                      key={v.value}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setVisibility(v.value)}
                    >
                      <Text
                        style={[styles.chipText, active && styles.chipTextActive]}
                      >
                        {v.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.visHint}>
                {VISIBILITIES.find((v) => v.value === visibility)?.hint}
              </Text>
              <Text style={styles.label}>經文出處（選填）</Text>
              <TextInput
                style={styles.input}
                value={scriptureRef}
                onChangeText={setScriptureRef}
                placeholder="例如：詩篇 23:1"
              />
              <Text style={styles.label}>筆記內容</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={content}
                onChangeText={(t) => setContent(t.slice(0, CONTENT_MAX))}
                multiline
                scrollEnabled
                maxLength={CONTENT_MAX}
                textAlignVertical="top"
                placeholder="今天主對我說…"
              />
              <Text style={styles.counter}>
                {content.length}/{CONTENT_MAX}
              </Text>
            </ScrollView>
            <View style={styles.modalActions}>
              {editing ? (
                <Pressable
                  style={styles.shareModalBtn}
                  onPress={() =>
                    openShare({
                      ...editing,
                      category,
                      scriptureRef: scriptureRef.trim() || null,
                      content: content.trim() || editing.content,
                      visibility,
                    })
                  }
                >
                  <Ionicons
                    name="share-outline"
                    size={18}
                    color={theme.color.brand}
                  />
                  <Text style={styles.shareModalBtnText}>對外分享</Text>
                </Pressable>
              ) : (
                <View style={{ flex: 1 }} />
              )}
              <Pressable
                style={styles.cancelBtn}
                onPress={() => setModal(false)}
              >
                <Text>取消</Text>
              </Pressable>
              <Pressable
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={save}
                disabled={saving}
              >
                <Text style={styles.saveBtnText}>
                  {saving ? '儲存中…' : '儲存'}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={!!shareTarget}
        animationType="fade"
        transparent
        onRequestClose={() => !sharing && setShareTarget(null)}
      >
        <Pressable
          style={styles.shareBackdrop}
          onPress={() => !sharing && setShareTarget(null)}
        >
          <Pressable style={styles.shareSheet} onPress={() => {}}>
            <Text style={styles.shareTitle}>對外分享</Text>
            <Text style={styles.shareSub}>
              傳到 Facebook、LINE、Email，或匯出檔案
            </Text>
            {(
              [
                {
                  key: 'text' as const,
                  label: '分享文字（FB／LINE／Email…）',
                  icon: 'chatbubble-ellipses-outline' as const,
                },
                {
                  key: 'pdf' as const,
                  label:
                    Platform.OS === 'web'
                      ? '匯出 PDF（列印／儲存）'
                      : '匯出並分享 PDF',
                  icon: 'document-text-outline' as const,
                },
                {
                  key: 'docx' as const,
                  label:
                    Platform.OS === 'web' ? '下載 Word' : '匯出並分享 Word',
                  icon: 'document-outline' as const,
                },
              ] as const
            ).map((opt) => (
              <Pressable
                key={opt.key}
                style={[styles.shareOption, sharing && { opacity: 0.5 }]}
                disabled={sharing || !shareTarget}
                onPress={() => shareTarget && runShare(opt.key, shareTarget)}
              >
                <Ionicons
                  name={opt.icon}
                  size={20}
                  color={theme.color.brand}
                />
                <Text style={styles.shareOptionText}>{opt.label}</Text>
              </Pressable>
            ))}
            <Pressable
              style={styles.shareCancel}
              disabled={sharing}
              onPress={() => setShareTarget(null)}
            >
              <Text style={styles.shareCancelText}>
                {sharing ? '處理中…' : '取消'}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={!!commentNote}
        animationType="slide"
        transparent
        onRequestClose={() => setCommentNote(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View
            style={[
              styles.modal,
              { paddingBottom: Math.max(insets.bottom, 12), maxHeight: '88%' },
            ]}
          >
            <Text style={styles.modalTitle}>留言回應</Text>
            {commentNote ? (
              <Text style={styles.commentPreview} numberOfLines={3}>
                {commentNote.author?.displayName ?? '會友'}：
                {commentNote.content}
              </Text>
            ) : null}
            {commentLoading ? (
              <ActivityIndicator style={{ marginVertical: 24 }} />
            ) : (
              <FlatList
                data={comments}
                keyExtractor={(c) => c.id}
                style={{ maxHeight: 280 }}
                ListEmptyComponent={
                  <Text style={styles.empty}>尚無留言，當第一個回應吧。</Text>
                }
                renderItem={({ item: c }) => (
                  <View style={styles.commentRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.commentAuthor}>
                        {c.author.displayName}
                      </Text>
                      <Text style={styles.commentBody}>{c.content}</Text>
                    </View>
                    {c.isMine || commentNote?.isMine ? (
                      <Pressable onPress={() => deleteComment(c)} hitSlop={8}>
                        <Text style={styles.del}>刪</Text>
                      </Pressable>
                    ) : null}
                  </View>
                )}
              />
            )}
            <View style={styles.commentComposer}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                value={commentText}
                onChangeText={(t) => setCommentText(t.slice(0, COMMENT_MAX))}
                placeholder="寫下你的回應…"
                maxLength={COMMENT_MAX}
              />
              <Pressable
                style={[styles.saveBtn, commentSaving && { opacity: 0.6 }]}
                onPress={submitComment}
                disabled={commentSaving || !commentText.trim()}
              >
                <Text style={styles.saveBtnText}>送出</Text>
              </Pressable>
            </View>
            <Pressable
              style={styles.shareCancel}
              onPress={() => setCommentNote(null)}
            >
              <Text style={styles.shareCancelText}>關閉</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.bg },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.bg,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: theme.color.bgElevated,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: theme.color.brand },
  tabText: { fontSize: 15, color: theme.color.inkMuted, fontWeight: '600' },
  tabTextActive: { color: theme.color.brand },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: theme.color.bgElevated,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.border,
  },
  hint: { fontSize: 12, color: theme.color.inkMuted, flex: 1, marginRight: 8 },
  addBtn: {
    backgroundColor: theme.color.brand,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.sm,
  },
  addBtnText: { color: theme.color.brandInk, fontWeight: '600' },
  searchWrap: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
    backgroundColor: theme.color.bg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.color.border,
    gap: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.color.bgElevated,
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: theme.color.ink,
    paddingVertical: 8,
  },
  filterRow: { gap: 8, paddingRight: 8 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.color.border,
    backgroundColor: theme.color.bgElevated,
  },
  filterChipActive: {
    backgroundColor: theme.color.brand,
    borderColor: theme.color.brand,
  },
  filterChipText: { fontSize: 13, color: theme.color.ink, fontWeight: '500' },
  filterChipTextActive: { color: theme.color.brandInk },
  list: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: theme.color.bgElevated,
    borderRadius: theme.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.color.border,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    flexWrap: 'wrap',
  },
  author: { fontSize: 14, fontWeight: '700', color: theme.color.ink },
  date: { fontSize: 12, fontWeight: '600', color: theme.color.brand },
  badge: {
    backgroundColor: theme.color.brandSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  badgeText: { fontSize: 12, color: theme.color.brand, fontWeight: '600' },
  badgePublic: { backgroundColor: theme.color.secondarySoft },
  badgePublicText: {
    fontSize: 12,
    color: theme.color.secondary,
    fontWeight: '600',
  },
  del: { fontSize: 13, color: theme.color.danger },
  ref: { fontSize: 13, color: theme.color.inkMuted, marginBottom: 4 },
  preview: { fontSize: 15, lineHeight: 22, color: theme.color.ink },
  actionBar: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.color.border,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  actionText: { fontSize: 13, color: theme.color.inkMuted, fontWeight: '600' },
  empty: { textAlign: 'center', color: theme.color.inkMuted, marginTop: 40 },
  error: { color: theme.color.danger, paddingHorizontal: 16, paddingTop: 8 },
  shareBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  shareSheet: {
    backgroundColor: theme.color.bgElevated,
    borderTopLeftRadius: theme.radius.md,
    borderTopRightRadius: theme.radius.md,
    padding: 20,
    paddingBottom: 28,
    gap: 8,
  },
  shareTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.color.ink,
    marginBottom: 2,
  },
  shareSub: {
    fontSize: 13,
    color: theme.color.inkMuted,
    marginBottom: 8,
  },
  shareOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.color.bg,
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  shareOptionText: { fontSize: 15, color: theme.color.ink, fontWeight: '500' },
  shareCancel: { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  shareCancelText: { fontSize: 15, color: theme.color.inkMuted },
  shareModalBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  shareModalBtnText: {
    fontSize: 15,
    color: theme.color.brand,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: theme.color.bgElevated,
    borderTopLeftRadius: theme.radius.md,
    borderTopRightRadius: theme.radius.md,
    paddingHorizontal: 20,
    paddingTop: 20,
    maxHeight: '92%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    color: theme.color.ink,
  },
  modalBody: {
    flexGrow: 0,
    maxHeight: 420,
  },
  modalBodyContent: {
    gap: 8,
    paddingBottom: 8,
  },
  label: { fontSize: 12, color: theme.color.inkMuted },
  visHint: { fontSize: 12, color: theme.color.secondary, marginBottom: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.color.border,
    backgroundColor: theme.color.bgElevated,
  },
  chipActive: {
    backgroundColor: theme.color.brand,
    borderColor: theme.color.brand,
  },
  chipText: { fontSize: 14, color: theme.color.ink, fontWeight: '500' },
  chipTextActive: { color: theme.color.brandInk },
  counter: {
    fontSize: 12,
    color: theme.color.inkMuted,
    textAlign: 'right',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.sm,
    padding: 10,
    fontSize: 15,
    marginBottom: 4,
    color: theme.color.ink,
    backgroundColor: theme.color.bgElevated,
  },
  textarea: { minHeight: 140, maxHeight: 220 },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.color.border,
    backgroundColor: theme.color.bgElevated,
  },
  cancelBtn: { padding: 12 },
  saveBtn: {
    backgroundColor: theme.color.brand,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: theme.radius.sm,
  },
  saveBtnText: { color: theme.color.brandInk, fontWeight: '600' },
  commentPreview: {
    fontSize: 13,
    color: theme.color.inkMuted,
    marginBottom: 12,
    lineHeight: 20,
  },
  commentRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.color.border,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.color.ink,
    marginBottom: 2,
  },
  commentBody: { fontSize: 14, color: theme.color.ink, lineHeight: 20 },
  commentComposer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
});
