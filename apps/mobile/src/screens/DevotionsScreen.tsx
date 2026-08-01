import { useCallback, useEffect, useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, ApiError } from '../lib/api';
import { theme } from '../theme';

interface DevotionNote {
  id: string;
  noteDate: string;
  scriptureRef: string | null;
  content: string;
  visibility: string;
  createdAt: string;
}

const CONTENT_MAX = 800;

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

/**
 * 晨禱靈修筆記：雲端同步、AES 加密儲存、預設私人。
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
  const [scriptureRef, setScriptureRef] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

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
    setScriptureRef('');
    setContent('');
    setModal(true);
  }

  function openEdit(n: DevotionNote) {
    setEditing(n);
    setNoteDate(String(n.noteDate).slice(0, 10));
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
            scriptureRef: scriptureRef || undefined,
            content: content.trim(),
          }),
        });
      } else {
        await api('/devotions', {
          method: 'POST',
          body: JSON.stringify({
            noteDate: new Date(noteDate).toISOString(),
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
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
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
          <Text style={styles.empty}>尚無筆記，點右上角開始寫晨禱。</Text>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => openEdit(item)}>
            <View style={styles.row}>
              <Text style={styles.date}>
                {String(item.noteDate).slice(0, 10)}
              </Text>
              <Pressable onPress={() => confirmDelete(item)}>
                <Text style={styles.del}>刪除</Text>
              </Pressable>
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
              {editing ? '編輯筆記' : '新增晨禱筆記'}
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
  date: { fontSize: 13, fontWeight: '600', color: theme.color.brand },
  del: { fontSize: 13, color: theme.color.danger },
  ref: { fontSize: 13, color: theme.color.inkMuted, marginBottom: 4 },
  preview: { fontSize: 15, lineHeight: 22, color: theme.color.ink },
  empty: { textAlign: 'center', color: theme.color.inkMuted, marginTop: 40 },
  error: { color: theme.color.danger, paddingHorizontal: 16, paddingTop: 8 },
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
  // 固定高度＋內部捲動，避免把「儲存」擠出畫面
  textarea: { minHeight: 140, maxHeight: 220 },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
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
