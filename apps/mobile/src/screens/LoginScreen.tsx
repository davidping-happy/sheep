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
        <Text style={styles.brand}>教會 APP</Text>
        <Text style={styles.sub}>
          {mode === 'login' ? '登入後使用代禱牆等個人化功能' : '註冊新會友帳號'}
        </Text>

        {mode === 'register' ? (
          <TextInput
            style={styles.input}
            placeholder="顯示名稱"
            value={displayName}
            onChangeText={setDisplayName}
            autoCapitalize="words"
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
        />
        <TextInput
          style={styles.input}
          placeholder="密碼（至少 10 字元）"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete={mode === 'login' ? 'password' : 'new-password'}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.btn, busy && styles.btnDisabled]}
          onPress={submit}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
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

        <Text style={styles.hint}>
          後台同工帳號也可登入：admin@church.local{'\n'}
          API 需在本機 :3000 運行
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f6f5f0',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 12,
  },
  brand: { fontSize: 28, fontWeight: '700', color: '#1f2937' },
  sub: { fontSize: 14, color: '#6b7280', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  btn: {
    backgroundColor: '#4f46e5',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  switch: {
    textAlign: 'center',
    color: '#4f46e5',
    fontSize: 14,
    marginTop: 4,
  },
  error: { color: '#dc2626', fontSize: 13 },
  hint: { fontSize: 12, color: '#9ca3af', marginTop: 8, lineHeight: 18 },
});
