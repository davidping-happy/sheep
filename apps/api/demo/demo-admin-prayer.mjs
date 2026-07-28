/**
 * 模擬 admin-web「代禱牆審核」畫面流程：
 * 登入 → 載入佇列 → 核准 / 退回 → 確認佇列更新
 * （與後台 /prayer 頁相同的 API 呼叫）
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

const rnd = Math.random().toString(36).slice(2, 8);

async function main() {
  console.log(`\n=== Admin 代禱牆審核 UI 流程模擬 (${BASE}) ===\n`);

  // 會友發布兩則待審公開代禱
  const mem = await call('/auth/register', {
    method: 'POST',
    body: {
      email: `moddemo_${rnd}@church.local`,
      password: 'DemoPassw0rd!',
      displayName: '審核測試會友',
    },
  });
  const memberToken = mem.data.accessToken;

  const p1 = await call('/prayer', {
    method: 'POST',
    token: memberToken,
    body: { content: '【後台審核測試】請為教會聚會禱告。', visibility: 'PUBLIC' },
  });
  const p2 = await call('/prayer', {
    method: 'POST',
    token: memberToken,
    body: { content: '【後台退回測試】不當內容範例。', visibility: 'PUBLIC' },
  });
  assert(p1.data.moderationStatus === 'PENDING', '公開代禱 1 進入 PENDING');
  assert(p2.data.moderationStatus === 'PENDING', '公開代禱 2 進入 PENDING');

  // 同後台：登入
  console.log('\n1) 後台登入');
  const login = await call('/auth/login', {
    method: 'POST',
    body: { email: 'admin@church.local', password: ADMIN_PASSWORD },
  });
  assert(login.status === 201 && login.data.accessToken, '管理員登入取得 token');
  const token = login.data.accessToken;

  // 同後台：載入佇列
  console.log('\n2) 載入審核佇列 GET /prayer/moderation/queue');
  const queue = await call('/prayer/moderation/queue', { token });
  assert(queue.status === 200, '佇列載入成功');
  assert(
    queue.data.some((x) => x.id === p1.data.id) &&
      queue.data.some((x) => x.id === p2.data.id),
    `佇列含兩則待審（目前 ${queue.data.length} 筆）`,
  );

  // 同後台：點「核准」
  console.log('\n3) 點核准 / 退回');
  const approve = await call(`/prayer/${p1.data.id}/moderate`, {
    method: 'POST',
    token,
    body: { decision: 'APPROVED' },
  });
  assert(approve.data.moderationStatus === 'APPROVED', '核准成功');

  const reject = await call(`/prayer/${p2.data.id}/moderate`, {
    method: 'POST',
    token,
    body: { decision: 'REJECTED' },
  });
  assert(reject.data.moderationStatus === 'REJECTED', '退回成功');

  // 佇列不再含已處理項目
  console.log('\n4) 重新整理佇列');
  const queue2 = await call('/prayer/moderation/queue', { token });
  assert(
    !queue2.data.some((x) => x.id === p1.data.id || x.id === p2.data.id),
    '已處理項目從佇列消失',
  );

  // 核准後：其他會友可見；退回後：其他會友不可見（作者本人仍可見自己的貼文狀態）
  const other = await call('/auth/register', {
    method: 'POST',
    body: {
      email: `viewer_${rnd}@church.local`,
      password: 'DemoPassw0rd!',
      displayName: '旁觀會友',
    },
  });
  const feed = await call('/prayer/feed', { token: other.data.accessToken });
  assert(
    feed.data.some((x) => x.id === p1.data.id),
    '核准後其他會友 feed 可見',
  );
  assert(
    !feed.data.some((x) => x.id === p2.data.id),
    '退回後其他會友 feed 不可見',
  );

  console.log(`\n=== 結果：${pass} 通過 / ${fail} 失敗 ===\n`);
  console.log('提示：啟動後台後可於 http://localhost:3001/prayer 手動操作相同流程。');
  console.log('  cd apps/admin-web && npm run dev');
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
