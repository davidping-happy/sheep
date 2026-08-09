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
import { ImageGallery } from '../components/ImageGallery';
import { api, ApiError } from '../lib/api';
import {
  PRIVACY_CONSENT_LABEL,
  buildPrivacyStatement,
} from '../lib/privacy-statement';
import { theme } from '../theme';

interface EventItem {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  coverUrl?: string | null;
  imageUrls?: string[];
  startAt: string;
  capacity: number | null;
  registerDeadline: string | null;
  requiresGuardianConsent: boolean;
}

interface Registration {
  id: string;
  status: string;
  eventId: string;
}

const STATUS: Record<string, string> = {
  REGISTERED: '已報名',
  WAITLISTED: '候補',
  CANCEL_PENDING: '取消審核中',
  CANCELLED: '已取消',
};

/**
 * 課程活動報名：報名表單（姓名／小組／電話＋個資聲明）、一鍵簽到。
 */
export default function EventsScreen() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [regs, setRegs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [info, setInfo] = useState('');

  const [registerEvent, setRegisterEvent] = useState<EventItem | null>(null);
  const [regName, setRegName] = useState('');
  const [regGroup, setRegGroup] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [privacyOk, setPrivacyOk] = useState(false);
  const [guardianOk, setGuardianOk] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const [data, mine] = await Promise.all([
        api<EventItem[]>('/events'),
        api<{ eventId: string; status: string }[]>('/events/mine'),
      ]);
      setEvents(data);
      const map: Record<string, string> = {};
      for (const m of mine) map[m.eventId] = m.status;
      setRegs(map);
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

  function openRegister(ev: EventItem) {
    setRegisterEvent(ev);
    setRegName('');
    setRegGroup('');
    setRegPhone('');
    setPrivacyOk(false);
    setGuardianOk(false);
    setError('');
  }

  async function submitRegister() {
    if (!registerEvent) return;
    if (!regName.trim() || !regGroup.trim() || !regPhone.trim()) {
      setError('請填寫姓名、小組與電話');
      return;
    }
    if (!privacyOk) {
      setError('請勾選同意個資聲明');
      return;
    }
    if (registerEvent.requiresGuardianConsent && !guardianOk) {
      setError('此活動需監護人同意');
      return;
    }
    setBusyId(registerEvent.id);
    setError('');
    try {
      const r = await api<Registration>(
        `/events/${registerEvent.id}/register`,
        {
          method: 'POST',
          body: JSON.stringify({
            registrantName: regName.trim(),
            registrantGroup: regGroup.trim(),
            registrantPhone: regPhone.trim(),
            privacyConsent: true,
            ...(registerEvent.requiresGuardianConsent
              ? { guardianConsent: true }
              : {}),
          }),
        },
      );
      setRegs((prev) => ({ ...prev, [registerEvent.id]: r.status }));
      setInfo(
        `${registerEvent.title}：${STATUS[r.status] ?? r.status}`,
      );
      setRegisterEvent(null);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : '報名失敗';
      setError(msg);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(msg);
      } else {
        Alert.alert('無法完成報名', msg);
      }
    } finally {
      setBusyId(null);
    }
  }

  function cancel(ev: EventItem) {
    const confirmMsg =
      '取消報名需待管理員審核通過後才會生效，確定送出申請？';
    const run = async () => {
      setBusyId(ev.id);
      setError('');
      try {
        const r = await api<Registration>(`/events/${ev.id}/cancel`, {
          method: 'POST',
        });
        setRegs((prev) => ({ ...prev, [ev.id]: r.status }));
        const msg =
          r.status === 'CANCEL_PENDING'
            ? `${ev.title}：已送出取消申請，待管理員審核`
            : `${ev.title}：${STATUS[r.status] ?? r.status}`;
        setInfo(msg);
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert(msg);
        } else {
          Alert.alert('取消報名', msg);
        }
      } catch (e) {
        setError(e instanceof ApiError ? e.message : '取消失敗');
      } finally {
        setBusyId(null);
      }
    };
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(confirmMsg)) void run();
    } else {
      Alert.alert('取消報名', confirmMsg, [
        { text: '再想想', style: 'cancel' },
        { text: '送出申請', style: 'destructive', onPress: () => void run() },
      ]);
    }
  }

  async function checkin(ev: EventItem) {
    setBusyId(ev.id);
    setError('');
    try {
      await api(`/events/${ev.id}/checkin-self`, { method: 'POST' });
      const msg = '完成簽到';
      setInfo(`${ev.title}：${msg}`);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(msg);
      } else {
        Alert.alert(msg);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '簽到失敗');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const privacyText = buildPrivacyStatement(theme.brandName);

  return (
    <View style={styles.root}>
      {info ? <Text style={styles.info}>{info}</Text> : null}
      {error && !registerEvent ? (
        <Text style={styles.error}>{error}</Text>
      ) : null}
      <FlatList
        data={events}
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
          <Text style={styles.empty}>
            尚無課程活動。請同工於後台建立後再來看。
          </Text>
        }
        renderItem={({ item }) => {
          const status = regs[item.id];
          return (
            <View style={styles.card}>
              <ImageGallery
                urls={item.imageUrls}
                coverUrl={item.coverUrl}
                height={160}
              />
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.meta}>
                {new Date(item.startAt).toLocaleString()}
                {item.location ? ` · ${item.location}` : ''}
              </Text>
              {item.capacity != null ? (
                <Text style={styles.meta}>名額上限 {item.capacity}</Text>
              ) : null}
              {item.requiresGuardianConsent ? (
                <Text style={styles.badge}>兒少・需監護人同意</Text>
              ) : null}
              {item.description ? (
                <Text style={styles.desc}>{item.description}</Text>
              ) : null}
              {status ? (
                <Text style={styles.status}>
                  狀態：{STATUS[status] ?? status}
                </Text>
              ) : null}
              <View style={styles.actions}>
                {!status || status === 'CANCELLED' ? (
                  <Pressable
                    style={styles.primary}
                    disabled={busyId === item.id}
                    onPress={() => openRegister(item)}
                  >
                    <Text style={styles.primaryText}>報名</Text>
                  </Pressable>
                ) : status === 'CANCEL_PENDING' ? (
                  <Pressable style={styles.ghost} disabled>
                    <Text>取消審核中</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    style={styles.ghost}
                    disabled={busyId === item.id}
                    onPress={() => cancel(item)}
                  >
                    <Text>取消報名</Text>
                  </Pressable>
                )}
                <Pressable
                  style={styles.ghost}
                  disabled={busyId === item.id || status !== 'REGISTERED'}
                  onPress={() => checkin(item)}
                >
                  <Text>簽到</Text>
                </Pressable>
              </View>
            </View>
          );
        }}
      />

      <Modal visible={!!registerEvent} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              報名 — {registerEvent?.title}
            </Text>
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={{ gap: 10, paddingBottom: 8 }}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.label}>姓名</Text>
              <TextInput
                style={styles.input}
                value={regName}
                onChangeText={setRegName}
                placeholder="請輸入姓名"
                placeholderTextColor={theme.color.inkMuted}
              />
              <Text style={styles.label}>小組</Text>
              <TextInput
                style={styles.input}
                value={regGroup}
                onChangeText={setRegGroup}
                placeholder="請輸入小組名稱"
                placeholderTextColor={theme.color.inkMuted}
              />
              <Text style={styles.label}>電話</Text>
              <TextInput
                style={styles.input}
                value={regPhone}
                onChangeText={setRegPhone}
                placeholder="請輸入聯絡電話"
                keyboardType="phone-pad"
                placeholderTextColor={theme.color.inkMuted}
              />

              <Text style={styles.privacyTitle}>個資聲明</Text>
              <ScrollView style={styles.privacyBox} nestedScrollEnabled>
                <Text style={styles.privacyText}>{privacyText}</Text>
              </ScrollView>

              <Pressable
                style={styles.checkRow}
                onPress={() => setPrivacyOk((v) => !v)}
              >
                <View style={[styles.checkbox, privacyOk && styles.checkboxOn]}>
                  {privacyOk ? (
                    <Text style={styles.checkboxMark}>✓</Text>
                  ) : null}
                </View>
                <Text style={styles.checkLabel}>{PRIVACY_CONSENT_LABEL}</Text>
              </Pressable>

              {registerEvent?.requiresGuardianConsent ? (
                <Pressable
                  style={styles.checkRow}
                  onPress={() => setGuardianOk((v) => !v)}
                >
                  <View
                    style={[styles.checkbox, guardianOk && styles.checkboxOn]}
                  >
                    {guardianOk ? (
                      <Text style={styles.checkboxMark}>✓</Text>
                    ) : null}
                  </View>
                  <Text style={styles.checkLabel}>
                    我確認已取得監護人同意（兒少活動）
                  </Text>
                </Pressable>
              ) : null}

              {error ? <Text style={styles.errorInline}>{error}</Text> : null}
            </ScrollView>

            <View style={styles.actions}>
              <Pressable
                style={styles.ghost}
                onPress={() => {
                  setRegisterEvent(null);
                  setError('');
                }}
              >
                <Text>取消</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.primary,
                  busyId === registerEvent?.id && { opacity: 0.6 },
                ]}
                disabled={busyId === registerEvent?.id}
                onPress={submitRegister}
              >
                <Text style={styles.primaryText}>送出報名</Text>
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
  list: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: theme.color.bgElevated,
    borderRadius: theme.radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.color.border,
    marginBottom: 12,
    gap: 4,
  },
  title: { fontSize: 17, fontWeight: '700', color: theme.color.ink },
  meta: { fontSize: 13, color: theme.color.inkMuted },
  desc: { fontSize: 14, color: theme.color.ink, marginTop: 6 },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 4,
    fontSize: 11,
    color: theme.color.warn,
    backgroundColor: theme.color.warnSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
  },
  status: {
    marginTop: 8,
    fontSize: 13,
    color: theme.color.brand,
    fontWeight: '600',
  },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  primary: {
    backgroundColor: theme.color.brand,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.radius.sm,
  },
  primaryText: { color: theme.color.brandInk, fontWeight: '600' },
  ghost: {
    borderWidth: 1,
    borderColor: theme.color.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.color.bgElevated,
  },
  empty: { textAlign: 'center', color: theme.color.inkMuted, marginTop: 40 },
  error: { color: theme.color.danger, padding: 12 },
  errorInline: { color: theme.color.danger, fontSize: 13 },
  info: {
    color: theme.color.success,
    padding: 12,
    backgroundColor: theme.color.successSoft,
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
    padding: 20,
    maxHeight: '92%',
    gap: 10,
  },
  modalScroll: { maxHeight: 420 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: theme.color.ink },
  label: { fontSize: 12, color: theme.color.inkMuted },
  input: {
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.sm,
    padding: 12,
    fontSize: 16,
    color: theme.color.ink,
    backgroundColor: theme.color.bgElevated,
  },
  privacyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.color.ink,
    marginTop: 4,
  },
  privacyBox: {
    maxHeight: 160,
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.sm,
    padding: 12,
    backgroundColor: theme.color.bg,
  },
  privacyText: {
    fontSize: 13,
    lineHeight: 20,
    color: theme.color.ink,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: theme.color.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    backgroundColor: theme.color.bgElevated,
  },
  checkboxOn: {
    backgroundColor: theme.color.brand,
    borderColor: theme.color.brand,
  },
  checkboxMark: { color: '#fff', fontSize: 14, fontWeight: '700' },
  checkLabel: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: theme.color.ink,
  },
});
