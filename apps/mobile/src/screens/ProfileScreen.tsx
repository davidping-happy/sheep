import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useAuth } from '../auth/AuthContext';
import { ServerSettingsModal } from '../components/ServerSettingsModal';
import { getApiBase } from '../lib/api-base';
import { tokenStore } from '../lib/secure-store';
import { theme } from '../theme';

function decodeEmail(token: string | null): string {
  if (!token) return '';
  try {
    const payload = token.split('.')[1];
    if (!payload) return '';
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const decode =
      typeof globalThis.atob === 'function'
        ? globalThis.atob
        : (s: string) => Buffer.from(s, 'base64').toString('utf8');
    const json = JSON.parse(decode(pad)) as { email?: string };
    return json.email ?? '';
  } catch {
    return '';
  }
}

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [serverOpen, setServerOpen] = useState(false);
  const [apiBase, setApiBaseLabel] = useState('');
  const version =
    Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '1.1.0';

  useEffect(() => {
    tokenStore.getAccess().then((t) => setEmail(decodeEmail(t)));
  }, []);

  useEffect(() => {
    getApiBase().then(setApiBaseLabel);
  }, [serverOpen]);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.pad}>
      <View style={styles.avatarWrap}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={40} color={theme.color.brand} />
        </View>
        <Text style={styles.name}>會友</Text>
        {email ? <Text style={styles.email}>{email}</Text> : null}
      </View>

      <View style={styles.card}>
        <Row icon="home-outline" label="所屬牧區" value={theme.brandName} />
        <Row icon="people-outline" label="身份" value="會友" />
        <Pressable
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]}
          onPress={() => setServerOpen(true)}
        >
          <Ionicons name="server-outline" size={18} color={theme.color.inkMuted} />
          <Text style={styles.rowLabel}>伺服器連線設定</Text>
          <Text style={styles.rowValue} numberOfLines={1}>
            {apiBase || '…'}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={theme.color.inkMuted}
          />
        </Pressable>
      </View>

      <Text style={styles.ver}>App 版本 {version}</Text>

      <Pressable
        style={({ pressed }) => [styles.logout, pressed && { opacity: 0.85 }]}
        onPress={() => signOut()}
      >
        <Ionicons name="log-out-outline" size={20} color={theme.color.danger} />
        <Text style={styles.logoutText}>登出</Text>
      </Pressable>

      <ServerSettingsModal
        visible={serverOpen}
        current={apiBase}
        onClose={() => setServerOpen(false)}
      />
    </ScrollView>
  );
}

function Row({
  icon,
  label,
  value,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Ionicons name={icon} size={18} color={theme.color.inkMuted} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.bg },
  pad: { padding: 20, paddingBottom: 40 },
  avatarWrap: { alignItems: 'center', marginBottom: 24, marginTop: 8 },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: theme.color.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  name: { fontSize: 22, fontWeight: '700', color: theme.color.ink },
  email: { fontSize: 14, color: theme.color.inkMuted, marginTop: 4 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.color.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 52,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.color.border,
  },
  rowLabel: { flex: 1, fontSize: 15, color: theme.color.ink },
  rowValue: {
    fontSize: 14,
    color: theme.color.inkMuted,
    maxWidth: '42%',
    textAlign: 'right',
  },
  ver: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 12,
    color: theme.color.inkMuted,
  },
  logout: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  logoutText: { fontSize: 16, fontWeight: '600', color: theme.color.danger },
});
