/**
 * 驗證後台活動名單 API 流程（對應 /events 畫面操作）
 */
const BASE = process.env.API_BASE ?? 'http://localhost:3000/api';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'ChangeMe123456';

async function call(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

let pass = 0;
let fail = 0;
function assert(cond, label) {
  if (cond) {
    pass++;
    console.log(`  ✔ ${label}`);
  } else {
    fail++;
    console.log(`  ✘ ${label}`);
  }
}

async function main() {
  console.log('\n=== 後台活動名單 UI 流程 ===\n');
  const login = await call('/auth/login', {
    method: 'POST',
    body: { email: 'admin@church.local', password: ADMIN_PASSWORD },
  });
  assert(login.data?.accessToken, '管理員登入');
  const token = login.data.accessToken;

  const created = await call('/events', {
    method: 'POST',
    token,
    body: {
      title: '後台UI測試聚會',
      location: '副堂',
      startAt: new Date(Date.now() + 864e5 * 5).toISOString(),
      capacity: 10,
    },
  });
  assert(created.status === 201 && created.data?.id, '建立活動');
  const id = created.data.id;

  const list = await call('/events', { token });
  assert(list.data?.some((e) => e.id === id), '活動列表含新建項目');

  const mem = await call('/auth/register', {
    method: 'POST',
    body: {
      email: `evtui_${Math.random().toString(36).slice(2, 8)}@church.local`,
      password: 'DemoPassw0rd!',
      displayName: '報名測試',
    },
  });
  await call(`/events/${id}/register`, {
    method: 'POST',
    token: mem.data.accessToken,
    body: {},
  });

  const roster = await call(`/events/${id}/roster`, { token });
  assert(roster.status === 200 && roster.data?.length >= 1, '查看出席名單');

  const qr = await call(`/events/${id}/checkin-token`, { method: 'POST', token });
  assert(qr.data?.token && qr.data.ttlSeconds === 30, '產生動態簽到碼');

  console.log(`\n=== ${pass} 通過 / ${fail} 失敗 ===\n`);
  console.log('後台畫面：http://localhost:3001/events');
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
