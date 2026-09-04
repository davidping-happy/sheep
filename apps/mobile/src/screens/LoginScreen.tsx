import {
  ActivityIndicator,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../lib/api';
import { theme } from '../theme';
import ForgotAccessPanel from './ForgotAccessPanel';

const ACCOUNT_OK = /^[\u4e00-\u9fff\u3400-\u4dbfa-zA-Z0-9]{2,32}$/;

/**
 * 成二牧區登入 — 帳號（顯示名稱）＋密碼；註冊另填手機
 */
export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError('');
    setBusy(true);
    try {
      if (password.length < 6) throw new Error('密碼至少 6 字元（英文、數字皆可）');
      if (mode === 'login') {
        if (!account.trim()) throw new Error('請輸入帳號');
        await signIn(account.trim(), password);
      } else {
        const a = account.trim();
        if (!ACCOUNT_OK.test(a)) {
          throw new Error('帳號限 2～32 字，可為繁體中文、英文、數字');
        }
        if (!phone.trim()) throw new Error('請填寫手機號碼（忘記帳號／密碼用）');
        await register(a, password, phone.trim());
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
    <View style={[styles.root, { paddingBottom: insets.bottom }]}>
      <ImageBackground
        source={require('../../assets/brand/login-hero.png')}
        style={styles.hero}
        imageStyle={styles.heroImg}
      >
        <View style={styles.heroShade} />
        <Text style={styles.heroBrand}>{theme.brandName}</Text>
        <Text style={styles.heroTag}>{theme.tagline}</Text>
      </ImageBackground>

      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          {mode === 'forgot' ? (
            <ForgotAccessPanel
              onBack={() => {
                setMode('login');
                setError('');
              }}
              onFilledAccount={setAccount}
            />
          ) : (
            <>
              <Text style={styles.cardTitle}>
                {mode === 'login' ? '歡迎回家' : '加入屬靈家庭'}
              </Text>
              <Text style={styles.cardSub}>
                {mode === 'login'
                  ? '使用帳號與密碼登入（密碼至少 6 字元）'
                  : '註冊請填：帳號、手機、密碼（不必 Email）'}
              </Text>

              <View style={styles.field}>
                <Ionicons
                  name="person-circle-outline"
                  size={18}
                  color={theme.color.inkMuted}
                />
                <TextInput
                  style={styles.input}
                  placeholder="帳號（繁中／英文／數字）"
                  value={account}
                  onChangeText={setAccount}
                  autoCapitalize="none"
                  placeholderTextColor={theme.color.inkMuted}
                />
              </View>

              {mode === 'register' ? (
                <View style={styles.field}>
                  <Ionicons
                    name="call-outline"
                    size={18}
                    color={theme.color.inkMuted}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="手機（例：0912345678）"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    placeholderTextColor={theme.color.inkMuted}
                  />
                </View>
              ) : null}

              <View style={styles.field}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={theme.color.inkMuted}
                />
                <TextInput
                  style={styles.input}
                  placeholder="密碼（至少 6 字元，英文／數字）"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPw}
                  placeholderTextColor={theme.color.inkMuted}
                />
                <Pressable onPress={() => setShowPw((v) => !v)} hitSlop={8}>
                  <Ionicons
                    name={showPw ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={theme.color.inkMuted}
                  />
                </Pressable>
              </View>

              {mode === 'login' ? (
                <Pressable
                  onPress={() => {
                    setMode('forgot');
                    setError('');
                  }}
                  hitSlop={6}
                >
                  <Text style={styles.forgot}>忘記帳號 / 忘記密碼</Text>
                </Pressable>
              ) : null}

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Pressable
                style={[styles.btn, busy && { opacity: 0.65 }]}
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
            </>
          )}
        </View>
      </KeyboardAvoidingView>

      <Image
        source={require('../../assets/brand/login-footer.png')}
        style={styles.footer}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.bg },
  hero: {
    height: 220,
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingBottom: 28,
  },
  heroImg: { borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  heroShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(61,44,41,0.35)',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroBrand: {
    fontSize: 34,
    fontWeight: '700',
    color: '#fff',
    zIndex: 1,
  },
  heroTag: {
    fontSize: 15,
    color: '#F6E6DE',
    marginTop: 4,
    zIndex: 1,
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: -28,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: theme.color.border,
    gap: 12,
    shadowColor: '#3D2C29',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.color.ink,
  },
  cardSub: { fontSize: 14, color: theme.color.inkMuted, marginBottom: 4 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 50,
    backgroundColor: '#FFFCFA',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: theme.color.ink,
    paddingVertical: 10,
  },
  btn: {
    backgroundColor: theme.color.brand,
    borderRadius: 12,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  forgot: {
    color: '#2563EB',
    fontSize: 14,
    marginTop: -4,
  },
  switch: {
    textAlign: 'center',
    color: theme.color.brand,
    fontSize: 14,
    marginTop: 2,
  },
  error: { color: theme.color.danger, fontSize: 13 },
  footer: {
    height: 110,
    width: '100%',
    opacity: 0.95,
  },
});
