import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../lib/api';
import { theme } from '../theme';

/**
 * 會友登入／註冊。Token 存入 SecureStore（Keychain/Keystore）。
 */
export default function LoginScreen() {
  const { signIn, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password);
      } else {
        if (!displayName.trim()) throw new Error('請填寫顯示名稱');
        await register(email.trim(), password, displayName.trim());
      }
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : '登入失敗，請確認 API 已啟動',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.brand}>{theme.brandName}</Text>
        <Text style={styles.tagline}>{theme.tagline}</Text>
        <Text style={styles.sub}>
          {mode === 'login' ? '登入後與家人一起使用各項功能' : '註冊新會友帳號'}
        </Text>

        {mode === 'register' ? (
          <TextInput
            style={styles.input}
            placeholder="顯示名稱"
            value={displayName}
            onChangeText={setDisplayName}
            autoCapitalize="words"
            placeholderTextColor={theme.color.inkMuted}
          />
        ) : null}

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          placeholderTextColor={theme.color.inkMuted}
        />
        <TextInput
          style={styles.input}
          placeholder="密碼（至少 10 字元）"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete={mode === 'login' ? 'password' : 'new-password'}
          placeholderTextColor={theme.color.inkMuted}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.btn, busy && styles.btnDisabled]}
          onPress={submit}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color={theme.color.brandInk} />
          ) : (
            <Text style={styles.btnText}>
              {mode === 'login' ? '登入' : '註冊'}
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError('');
          }}
        >
          <Text style={styles.switch}>
            {mode === 'login' ? '還沒有帳號？註冊' : '已有帳號？登入'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: theme.color.bg,
  },
  card: {
    backgroundColor: theme.color.bgElevated,
    borderRadius: theme.radius.md,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.color.border,
    gap: 12,
  },
  brand: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.color.ink,
  },
  tagline: {
    fontSize: 15,
    color: theme.color.secondary,
    marginTop: -4,
  },
  sub: { fontSize: 14, color: theme.color.inkMuted, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: theme.tapMin,
    fontSize: 16,
    backgroundColor: theme.color.bgElevated,
    color: theme.color.ink,
  },
  btn: {
    backgroundColor: theme.color.brand,
    borderRadius: theme.radius.sm,
    paddingVertical: 14,
    minHeight: theme.tapMin,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: {
    color: theme.color.brandInk,
    fontSize: 16,
    fontWeight: '600',
  },
  switch: {
    textAlign: 'center',
    color: theme.color.brand,
    fontSize: 14,
    marginTop: 4,
  },
  error: { color: theme.color.danger, fontSize: 13 },
});
