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

interface DevotionNote {
  id: string;
  noteDate: string;
  category?: DevotionCategory | string | null;
  scriptureRef: string | null;
  content: string;
  visibility: string;
  createdAt: string;
}

const CONTENT_MAX = 800;

const CATEGORIES: { value: DevotionCategory; label: string }[] = [
  { value: 'SERMON', label: '講道' },
  { value: 'MORNING_PRAYER', label: '晨禱' },
  { value: 'DEVOTION', label: '靈修' },
];

function categoryLabel(value?: string | null) {
  return CATEGORIES.find((c) => c.value === value)?.label ?? '靈修';
}

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

/**
 * 靈修隨記：雲端同步、AES 加密儲存、預設私人；可選講道／晨禱／靈修。
 */
export default function DevotionsScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<DevotionNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<DevotionNote | null>(null);
  const [noteDate, setNoteDate] = useState(todayISO());
  const [category, setCategory] = useState<DevotionCategory>('DEVOTION');
  const [scriptureRef, setScriptureRef] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<
    DevotionCategory | 'ALL'
  >('ALL');
  const [shareTarget, setShareTarget] = useState<DevotionNote | null>(null);
  const [sharing, setSharing] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await api<DevotionNote[]>('/devotions');
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

  function openCreate() {
    setEditing(null);
    setNoteDate(todayISO());
    setCategory('DEVOTION');
    setScriptureRef('');
    setContent('');
    setModal(true);
  }

  function openEdit(n: DevotionNote) {
    setEditing(n);
    setNoteDate(String(n.noteDate).slice(0, 10));
    setCategory(
      (CATEGORIES.find((c) => c.value === n.category)?.value as DevotionCategory) ??
        'DEVOTION',
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
      if (editing) {
        await api(`/devotions/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            category,
            scriptureRef: scriptureRef || undefined,
            content: content.trim(),
          }),
        });
      } else {
        await api('/devotions', {
          method: 'POST',
          body: JSON.stringify({
            noteDate: new Date(noteDate).toISOString(),
            category,
            scriptureRef: scriptureRef || undefined,
            content: content.trim(),
            visibility: 'PRIVATE',
          }),
        });
      }
      setModal(false);
      await load();
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((n) => {
      if (filterCategory !== 'ALL') {
        const cat = (n.category as DevotionCategory) || 'DEVOTION';
        if (cat !== filterCategory) return false;
      }
      if (!q) return true;
      const hay = [
        n.content,
        n.scriptureRef ?? '',
        categoryLabel(n.category),
        String(n.noteDate).slice(0, 10),
      ]
        .join('\n')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, query, filterCategory]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.toolbar}>
        <Text style={styles.hint}>內容已加密同步；預設僅自己可見</Text>
        <Pressable style={styles.addBtn} onPress={openCreate}>
          <Text style={styles.addBtnText}>＋ 新筆記</Text>
        </Pressable>
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
            placeholder="搜尋過去筆記、經文、日期…"
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
        {query.trim() || filterCategory !== 'ALL' ? (
          <Text style={styles.resultCount}>
            {filtered.length}／{items.length} 筆
          </Text>
        ) : null}
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
            {items.length === 0
              ? '尚無筆記，點右上角開始寫靈修隨記。'
              : '找不到符合的筆記，請換關鍵字或分類。'}
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => openEdit(item)}>
            <View style={styles.row}>
              <View style={styles.meta}>
                <Text style={styles.date}>
                  {String(item.noteDate).slice(0, 10)}
                </Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {categoryLabel(item.category)}
                  </Text>
                </View>
              </View>
              <View style={styles.cardActions}>
                <Pressable
                  onPress={() => openShare(item)}
                  hitSlop={8}
                  accessibilityLabel="分享"
                >
                  <Text style={styles.share}>分享</Text>
                </Pressable>
                <Pressable onPress={() => confirmDelete(item)} hitSlop={8}>
                  <Text style={styles.del}>刪除</Text>
                </Pressable>
              </View>
            </View>
            {item.scriptureRef ? (
              <Text style={styles.ref}>{item.scriptureRef}</Text>
            ) : null}
            <Text style={styles.preview} numberOfLines={3}>
              {item.content}
            </Text>
          </Pressable>
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
                    })
                  }
                >
                  <Ionicons
                    name="share-outline"
                    size={18}
                    color={theme.color.brand}
                  />
                  <Text style={styles.shareModalBtnText}>分享</Text>
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
            <Text style={styles.shareTitle}>分享靈修隨記</Text>
            <Text style={styles.shareSub}>
              可傳到 LINE、Email，或匯出檔案
            </Text>
            {(
              [
                {
                  key: 'text' as const,
                  label: '分享文字（LINE／Email…）',
                  icon: 'chatbubble-ellipses-outline' as const,
                },
                {
                  key: 'pdf' as const,
                  label: Platform.OS === 'web' ? '匯出 PDF（列印／儲存）' : '匯出並分享 PDF',
                  icon: 'document-text-outline' as const,
                },
                {
                  key: 'docx' as const,
                  label: Platform.OS === 'web' ? '下載 Word' : '匯出並分享 Word',
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
  resultCount: { fontSize: 12, color: theme.color.inkMuted },
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
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  date: { fontSize: 13, fontWeight: '600', color: theme.color.brand },
  badge: {
    backgroundColor: theme.color.brandSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  badgeText: { fontSize: 12, color: theme.color.brand, fontWeight: '600' },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  share: { fontSize: 13, color: theme.color.brand, fontWeight: '600' },
  del: { fontSize: 13, color: theme.color.danger },
  ref: { fontSize: 13, color: theme.color.inkMuted, marginBottom: 4 },
  preview: { fontSize: 15, lineHeight: 22, color: theme.color.ink },
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
});
