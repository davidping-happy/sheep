import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import {
  getApiBase,
  getDefaultApiBase,
  normalizeApiBase,
  pingApiBase,
  resetApiBase,
  setApiBase,
} from '../lib/api-base';
import { theme } from '../theme';

export default function MoreScreen() {
  const version =
    Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '1.1.0';
  const [serverOpen, setServerOpen] = useState(false);
  const [current, setCurrent] = useState('');

  useEffect(() => {
    getApiBase().then(setCurrent);
  }, [serverOpen]);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.pad}>
      <Text style={styles.h1}>更多</Text>
      <Text style={styles.sub}>{theme.tagline}</Text>

      <View style={styles.card}>
        <Item
          icon="information-circle-outline"
          title="關於成二牧區"
          subtitle="我們的屬靈家庭"
        />
        <Item
          icon="globe-outline"
          title="教會 YouTube"
          subtitle="主日崇拜頻道"
          onPress={() =>
            Linking.openURL(
              'https://www.youtube.com/@breadoflifechristianchurch9830',
            )
          }
        />
        <Item
          icon="logo-youtube"
          title="成二牧區專屬頻道"
          subtitle="開啟瀏覽器"
          onPress={() =>
            Linking.openURL('https://www.youtube.com/@成二牧區高雄靈糧堂')
          }
        />
        <Item
          icon="server-outline"
          title="伺服器連線設定"
          subtitle={current || '載入中…'}
          onPress={() => setServerOpen(true)}
          last
        />
      </View>

      <Text style={styles.ver}>App 版本 {version}</Text>

      <ServerModal
        visible={serverOpen}
        current={current}
        onClose={() => setServerOpen(false)}
      />
    </ScrollView>
  );
}

function ServerModal({
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

function Item({
  icon,
  title,
  subtitle,
  onPress,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress?: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.item,
        !last && styles.itemBorder,
        pressed && onPress && { opacity: 0.75 },
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.iconBox}>
        <Ionicons name={icon} size={20} color={theme.color.brand} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.itemTitle}>{title}</Text>
        <Text style={styles.itemSub} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      {onPress ? (
        <Ionicons
          name="chevron-forward"
          size={18}
          color={theme.color.inkMuted}
        />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.bg },
  pad: { padding: 20, paddingBottom: 40 },
  h1: { fontSize: 26, fontWeight: '700', color: theme.color.ink },
  sub: {
    fontSize: 14,
    color: theme.color.inkMuted,
    marginTop: 4,
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.color.border,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 64,
  },
  itemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.color.border,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.color.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: { fontSize: 15, fontWeight: '600', color: theme.color.ink },
  itemSub: { fontSize: 12, color: theme.color.inkMuted, marginTop: 2 },
  ver: {
    textAlign: 'center',
    marginTop: 28,
    fontSize: 12,
    color: theme.color.inkMuted,
  },
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
