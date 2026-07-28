/**
 * 端到端 Demo：活動報名 + 動態 QR 簽到（系統設計文件 §6.1）。
 *
 * 前置：
 *   1) 已 npm install、prisma generate、prisma db push、npm run seed
 *   2) API 執行中：node dist/main.js  （http://localhost:3000/api）
 * 執行：
 *   node demo/demo-events.mjs
 */

const BASE = process.env.API_BASE ?? 'http://localhost:3000/api';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'ChangeMe123456';

let pass = 0;
let fail = 0;

function assert(cond, label) {
  if (cond) {
    pass++;
    console.log(`  \u2714 ${label}`);
  } else {
    fail++;
    console.log(`  \u2718 ${label}`);
  }
}

async function call(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

const rnd = Math.random().toString(36).slice(2, 8);
const inDays = (n) => new Date(Date.now() + n * 86400000).toISOString();

async function register(name) {
  const r = await call('/auth/register', {
    method: 'POST',
    body: {
      email: `${name}_${rnd}@church.local`,
      password: 'DemoPassw0rd!',
      displayName: name,
    },
  });
  return r.data.accessToken;
}

async function main() {
  console.log(`\n=== 教會 APP Demo：活動報名 + 動態 QR 簽到 (${BASE}) ===\n`);

  // ── 準備帳號 ──
  console.log('0) 準備帳號');
  const alice = await register('Alice');
  const bob = await register('Bob');
  const carol = await register('Carol');
  const admin = (
    await call('/auth/login', {
      method: 'POST',
      body: { email: 'admin@church.local', password: ADMIN_PASSWORD },
    })
  ).data.accessToken;
  assert(alice && bob && carol && admin, '三位會友 + 管理員(主辦同工)就緒');

  // ── 1. 只有同工可建立活動 ──
  console.log('\n1) 建立活動（僅 STAFF 以上）');
  const forbidden = await call('/events', {
    method: 'POST',
    token: alice,
    body: { title: '一般會友不可建立', startAt: inDays(7) },
  });
  assert(forbidden.status === 403, '一般會友建立活動被擋 (403)');

  const created = await call('/events', {
    method: 'POST',
    token: admin,
    body: {
      title: '青年特會',
      location: '大堂',
      startAt: inDays(7),
      capacity: 2,
      registerDeadline: inDays(3),
    },
  });
  assert(created.status === 201 && created.data.id, '管理員建立活動成功（名額上限 2）');
  const eventId = created.data.id;

  // ── 2. 報名 + 額滿轉候補 ──
  console.log('\n2) 報名（額滿自動轉候補）');
  const rA = await call(`/events/${eventId}/register`, { method: 'POST', token: alice, body: {} });
  assert(rA.data.status === 'REGISTERED', 'Alice 報名成功（REGISTERED）');
  const rB = await call(`/events/${eventId}/register`, { method: 'POST', token: bob, body: {} });
  assert(rB.data.status === 'REGISTERED', 'Bob 報名成功（REGISTERED）');
  const rC = await call(`/events/${eventId}/register`, { method: 'POST', token: carol, body: {} });
  assert(rC.data.status === 'WAITLISTED', '額滿後 Carol 轉候補（WAITLISTED）');

  // ── 3. 報名截止 ──
  console.log('\n3) 報名截止檢查');
  const closed = await call('/events', {
    method: 'POST',
    token: admin,
    body: { title: '已截止活動', startAt: inDays(2), registerDeadline: inDays(-1) },
  });
  const closedReg = await call(`/events/${closed.data.id}/register`, {
    method: 'POST',
    token: alice,
    body: {},
  });
  assert(closedReg.status === 400, '截止後報名被擋 (400)');

  // ── 4. 兒少活動監護人同意 ──
  console.log('\n4) 兒少活動需監護人同意');
  const kids = await call('/events', {
    method: 'POST',
    token: admin,
    body: { title: '兒童營', startAt: inDays(10), requiresGuardianConsent: true },
  });
  const noConsent = await call(`/events/${kids.data.id}/register`, {
    method: 'POST',
    token: alice,
    body: {},
  });
  assert(noConsent.status === 400, '未附監護人同意被擋 (400)');
  const withConsent = await call(`/events/${kids.data.id}/register`, {
    method: 'POST',
    token: alice,
    body: { guardianConsent: true },
  });
  assert(withConsent.data.status === 'REGISTERED', '附監護人同意後報名成功');

  // ── 5. 動態 QR 簽到 ──
  console.log('\n5) 動態 QR Code 簽到（短效期 Token）');
  const aliceIssue = await call(`/events/${eventId}/checkin-token`, { method: 'POST', token: alice });
  assert(aliceIssue.status === 403, '非主辦同工不可產生簽到碼 (403)');

  const issued = await call(`/events/${eventId}/checkin-token`, { method: 'POST', token: admin });
  assert(issued.status === 201 && issued.data.token && issued.data.ttlSeconds === 30, '主辦同工產生 30 秒短效簽到碼');
  const qrToken = issued.data.token;

  const badCheckin = await call(`/events/${eventId}/checkin`, {
    method: 'POST',
    token: alice,
    body: { token: 'not-a-valid-token' },
  });
  assert(badCheckin.status === 400, '無效簽到碼被擋 (400)');

  const checkin = await call(`/events/${eventId}/checkin`, {
    method: 'POST',
    token: alice,
    body: { token: qrToken },
  });
  assert(checkin.status === 201 && checkin.data.method === 'DYNAMIC_QR', 'Alice 以動態 QR 簽到成功');

  // ── 6. 出席名單存取控制（行蹤資料）──
  console.log('\n6) 出席名單僅主辦同工/管理員可查（§四.8）');
  const bobRoster = await call(`/events/${eventId}/roster`, { token: bob });
  assert(bobRoster.status === 403, '一般會友不可查看名單 (403)');

  const roster = await call(`/events/${eventId}/roster`, { token: admin });
  assert(
    roster.status === 200 && roster.data.length >= 3,
    `管理員可查看名單（${roster.status === 200 ? roster.data.length : '?'} 筆）`,
  );

  // ── 7. 取消報名 ──
  console.log('\n7) 取消報名');
  const cancel = await call(`/events/${eventId}/cancel`, { method: 'POST', token: bob });
  assert(cancel.data.status === 'CANCELLED', 'Bob 取消報名（CANCELLED）');

  console.log(`\n=== 結果：${pass} 通過 / ${fail} 失敗 ===\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('Demo 執行錯誤：', e);
  process.exit(1);
});
