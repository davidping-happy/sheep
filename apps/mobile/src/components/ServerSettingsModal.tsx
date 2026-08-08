import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  getDefaultApiBase,
  normalizeApiBase,
  pingApiBase,
  resetApiBase,
  setApiBase,
} from '../lib/api-base';
import { theme } from '../theme';

export function ServerSettingsModal({
  visible,
  current,
  onClose,
}: {
  visible: boolean;
  current: string;
  onClose: () => void;
}) {
  const [value, setValue] = useState(current);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) {
      setValue(current);
      setStatus('');
    }
  }, [visible, current]);

  async function save() {
    setBusy(true);
    setStatus('');
    try {
      const normalized = normalizeApiBase(value);
      const ok = await pingApiBase(normalized);
      await setApiBase(normalized);
      setStatus(
        ok
          ? `已儲存並連線成功：${normalized}`
          : `已儲存，但連線測試失敗：${normalized}`,
      );
    } catch (e) {
      setStatus(e instanceof Error ? e.message : '儲存失敗');
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    setBusy(true);
    const base = await resetApiBase();
    setValue(base);
    setStatus(`已還原預設：${base}`);
    setBusy(false);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>伺服器連線設定</Text>
          <Text style={styles.sheetHint}>
            測試期間若教會伺服器網址更換，在這裡填新網址即可，不必重新安裝 App。
          </Text>

          <TextInput
            style={styles.input}
            value={value}
            onChangeText={setValue}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder="https://example.com/api"
            placeholderTextColor={theme.color.inkMuted}
          />
          <Text style={styles.defaultHint}>
            預設值：{getDefaultApiBase()}
          </Text>

          {status ? <Text style={styles.status}>{status}</Text> : null}

          <Pressable
            style={[styles.primary, busy && { opacity: 0.6 }]}
            onPress={save}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryText}>儲存並測試連線</Text>
            )}
          </Pressable>

          <View style={styles.rowBtns}>
            <Pressable style={styles.ghost} onPress={reset} disabled={busy}>
              <Text style={styles.ghostText}>還原預設</Text>
            </Pressable>
            <Pressable style={styles.ghost} onPress={onClose}>
              <Text style={styles.ghostText}>關閉</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(61,44,41,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.color.bg,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 22,
    gap: 12,
  },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: theme.color.ink },
  sheetHint: { fontSize: 13, color: theme.color.inkMuted, lineHeight: 20 },
  input: {
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 50,
    fontSize: 15,
    color: theme.color.ink,
    backgroundColor: '#fff',
  },
  defaultHint: { fontSize: 12, color: theme.color.inkMuted },
  status: { fontSize: 13, color: theme.color.secondary },
  primary: {
    backgroundColor: theme.color.brand,
    borderRadius: 12,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  rowBtns: { flexDirection: 'row', gap: 12 },
  ghost: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.color.border,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostText: { fontSize: 15, fontWeight: '600', color: theme.color.ink },
});
