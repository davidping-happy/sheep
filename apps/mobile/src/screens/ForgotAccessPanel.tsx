import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ApiError, api } from '../lib/api';
import { theme } from '../theme';

type Tab = 'password' | 'account';
type PwStep = 'account' | 'code';

type Props = {
  initialAccount?: string;
  onBack: () => void;
  onFilledAccount?: (account: string) => void;
};

/**
 * 忘記帳號／忘記密碼 — Email 與簡訊雙通道通知
 */
export default function ForgotAccessPanel({
  initialAccount = '',
  onBack,
  onFilledAccount,
}: Props) {
  const [tab, setTab] = useState<Tab>('password');
  const [pwStep, setPwStep] = useState<PwStep>('account');
  const [account, setAccount] = useState(initialAccount);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  async function sendCode() {
    setError('');
    setInfo('');
    const a = account.trim();
    if (!a) {
      setError('請輸入帳號（Email 或手機）');
      return;
    }
    setBusy(true);
    try {
      const res = await api<{
        ok: boolean;
        mailSent?: boolean;
        smsSent?: boolean;
        message?: string;
        debugCode?: string;
      }>(
        '/auth/forgot-password',
        { method: 'POST', body: JSON.stringify({ account: a }) },
        true,
      );
      let msg = res.message || '請查收驗證碼（Email／簡訊）';
      if (res.debugCode) msg += `\n（測試碼：${res.debugCode}）`;
      setInfo(msg);
      setPwStep('code');
      onFilledAccount?.(a);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : '送出失敗',
      );
    } finally {
      setBusy(false);
    }
  }

  async function submitNewPassword() {
    setError('');
    setInfo('');
    if (code.trim().length < 4) {
      setError('請輸入驗證碼');
      return;
    }
    if (newPassword.length < 6) {
      setError('新密碼至少 6 字元');
      return;
    }
    setBusy(true);
    try {
      const res = await api<{ ok: boolean; message?: string }>(
        '/auth/reset-password',
        {
          method: 'POST',
          body: JSON.stringify({
            account: account.trim(),
            code: code.trim(),
            newPassword,
          }),
        },
        true,
      );
      setInfo(res.message || '密碼已更新');
      onFilledAccount?.(account.trim());
      setTimeout(onBack, 1200);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : '重設失敗',
      );
    } finally {
      setBusy(false);
    }
  }

  async function lookupAccount() {
    setError('');
    setInfo('');
    if (!phone.trim()) {
      setError('請輸入註冊時的手機號碼');
      return;
    }
    setBusy(true);
    try {
      const res = await api<{
        ok: boolean;
        found?: boolean;
        emailHint?: string;
        mailSent?: boolean;
        smsSent?: boolean;
        message?: string;
      }>(
        '/auth/hint-account',
        {
          method: 'POST',
          body: JSON.stringify({ phone: phone.trim() }),
        },
        true,
      );
      setInfo(res.message || '');
      if (res.emailHint) {
        // 方便回到登入時填入（遮罩不可登入，僅提示）
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : '查詢失敗',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>忘記帳號 / 忘記密碼</Text>
      <Text style={styles.sub}>
        驗證與帳號提醒會同時透過 Email 與手機簡訊通知。
      </Text>

      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, tab === 'password' && styles.tabOn]}
          onPress={() => {
            setTab('password');
            setError('');
            setInfo('');
          }}
        >
          <Text
            style={[styles.tabText, tab === 'password' && styles.tabTextOn]}
          >
            忘記密碼
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === 'account' && styles.tabOn]}
          onPress={() => {
            setTab('account');
            setError('');
            setInfo('');
          }}
        >
          <Text
            style={[styles.tabText, tab === 'account' && styles.tabTextOn]}
          >
            忘記帳號
          </Text>
        </Pressable>
      </View>

      {tab === 'password' ? (
        <>
          <View style={styles.field}>
            <Ionicons
              name="person-circle-outline"
              size={18}
              color={theme.color.inkMuted}
            />
            <TextInput
              style={styles.input}
              placeholder="帳號（Email 或手機）"
              value={account}
              onChangeText={setAccount}
              autoCapitalize="none"
              editable={pwStep === 'account' || !busy}
              placeholderTextColor={theme.color.inkMuted}
            />
          </View>

          {pwStep === 'code' ? (
            <>
              <View style={styles.field}>
                <Ionicons
                  name="keypad-outline"
                  size={18}
                  color={theme.color.inkMuted}
                />
                <TextInput
                  style={styles.input}
                  placeholder="6 碼驗證碼"
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  maxLength={8}
                  placeholderTextColor={theme.color.inkMuted}
                />
              </View>
              <View style={styles.field}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={theme.color.inkMuted}
                />
                <TextInput
                  style={styles.input}
                  placeholder="新密碼（至少 6 字元）"
                  value={newPassword}
                  onChangeText={setNewPassword}
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
            </>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {info ? <Text style={styles.info}>{info}</Text> : null}

          <Pressable
            style={[styles.btn, busy && { opacity: 0.65 }]}
            onPress={pwStep === 'account' ? sendCode : submitNewPassword}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>
                {pwStep === 'account' ? '寄送驗證碼（Email＋簡訊）' : '確認重設密碼'}
              </Text>
            )}
          </Pressable>

          {pwStep === 'code' ? (
            <Pressable
              onPress={() => {
                setPwStep('account');
                setCode('');
                setNewPassword('');
                setError('');
                setInfo('');
              }}
            >
              <Text style={styles.link}>重新寄送／改帳號</Text>
            </Pressable>
          ) : null}
        </>
      ) : (
        <>
          <View style={styles.field}>
            <Ionicons
              name="call-outline"
              size={18}
              color={theme.color.inkMuted}
            />
            <TextInput
              style={styles.input}
              placeholder="註冊時的手機號碼"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholderTextColor={theme.color.inkMuted}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {info ? <Text style={styles.info}>{info}</Text> : null}

          <Pressable
            style={[styles.btn, busy && { opacity: 0.65 }]}
            onPress={lookupAccount}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>以 Email＋簡訊通知帳號</Text>
            )}
          </Pressable>
        </>
      )}

      <Pressable onPress={onBack}>
        <Text style={styles.back}>返回登入</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.color.ink,
  },
  sub: { fontSize: 14, color: theme.color.inkMuted, marginBottom: 4 },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.color.border,
    alignItems: 'center',
    backgroundColor: '#FFFCFA',
  },
  tabOn: {
    borderColor: theme.color.brand,
    backgroundColor: '#FFF5F0',
  },
  tabText: { fontSize: 14, color: theme.color.inkMuted, fontWeight: '600' },
  tabTextOn: { color: theme.color.brand },
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
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  link: {
    textAlign: 'center',
    color: '#2563EB',
    fontSize: 14,
  },
  back: {
    textAlign: 'center',
    color: theme.color.brand,
    fontSize: 14,
    marginTop: 2,
  },
  error: { color: theme.color.danger, fontSize: 13 },
  info: { color: theme.color.ink, fontSize: 13, lineHeight: 20 },
});
