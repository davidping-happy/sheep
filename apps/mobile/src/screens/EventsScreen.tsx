import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ImageGallery } from '../components/ImageGallery';
import { api, ApiError } from '../lib/api';
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
  CANCELLED: '已取消',
};

/**
 * 活動報名與簽到（階段二）：列表、報名／取消、輸入動態簽到碼。
 */
export default function EventsScreen() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [regs, setRegs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [checkinEvent, setCheckinEvent] = useState<EventItem | null>(null);
  const [token, setToken] = useState('');
  const [info, setInfo] = useState('');

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

  async function register(ev: EventItem) {
    setBusyId(ev.id);
    setError('');
    try {
      const body: { guardianConsent?: boolean } = {};
      if (ev.requiresGuardianConsent) body.guardianConsent = true;
      const r = await api<Registration>(`/events/${ev.id}/register`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setRegs((prev) => ({ ...prev, [ev.id]: r.status }));
      setInfo(`${ev.title}：${STATUS[r.status] ?? r.status}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '報名失敗');
    } finally {
      setBusyId(null);
    }
  }

  async function cancel(ev: EventItem) {
    setBusyId(ev.id);
    try {
      const r = await api<Registration>(`/events/${ev.id}/cancel`, {
        method: 'POST',
      });
      setRegs((prev) => ({ ...prev, [ev.id]: r.status }));
      setInfo(`${ev.title}：已取消`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '取消失敗');
    } finally {
      setBusyId(null);
    }
  }

  async function checkin() {
    if (!checkinEvent || !token.trim()) return;
    setBusyId(checkinEvent.id);
    setError('');
    let raw = token.trim();
    let eventId = checkinEvent.id;
    // 支援掃 QR 後貼上完整 payload：{"e":"eventId","t":"token"}
    if (raw.startsWith('{')) {
      try {
        const parsed = JSON.parse(raw) as { e?: string; t?: string };
        if (parsed.e && parsed.t) {
          eventId = parsed.e;
          raw = parsed.t;
        }
      } catch {
        /* 當作純 token */
      }
    }
    try {
      await api(`/events/${eventId}/checkin`, {
        method: 'POST',
        body: JSON.stringify({ token: raw }),
      });
      setInfo(`${checkinEvent.title}：簽到成功`);
      setCheckinEvent(null);
      setToken('');
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

  return (
    <View style={styles.root}>
      {info ? <Text style={styles.info}>{info}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
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
            尚無活動。請同工於後台建立後再來看。
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
                    onPress={() => register(item)}
                  >
                    <Text style={styles.primaryText}>報名</Text>
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
                  onPress={() => {
                    setCheckinEvent(item);
                    setToken('');
                    setError('');
                  }}
                >
                  <Text>現場簽到</Text>
                </Pressable>
              </View>
            </View>
          );
        }}
      />

      <Modal visible={!!checkinEvent} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              簽到 — {checkinEvent?.title}
            </Text>
            <Text style={styles.meta}>
              請掃描同工螢幕 QR，或貼上／輸入動態簽到碼（約 30 秒更新；須已報名）
            </Text>
            <TextInput
              style={styles.input}
              value={token}
              onChangeText={setToken}
              placeholder="簽到碼或 QR payload"
              autoCapitalize="none"
            />
            <View style={styles.actions}>
              <Pressable
                style={styles.ghost}
                onPress={() => setCheckinEvent(null)}
              >
                <Text>取消</Text>
              </Pressable>
              <Pressable style={styles.primary} onPress={checkin}>
                <Text style={styles.primaryText}>確認簽到</Text>
              </Pressable>
            </View>
          </View>
        </View>
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
  info: {
    color: theme.color.success,
    padding: 12,
    backgroundColor: theme.color.successSoft,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  modal: {
    backgroundColor: theme.color.bgElevated,
    borderRadius: theme.radius.md,
    padding: 20,
    gap: 10,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: theme.color.ink },
  input: {
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.sm,
    padding: 12,
    fontSize: 16,
    color: theme.color.ink,
    backgroundColor: theme.color.bgElevated,
  },
});
