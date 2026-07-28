/**
 * 端到端 Demo：auth + 代禱牆審核流程（系統設計文件 §四.3 / §6.2）。
 *
 * 前置：
 *   1) 已 npm install、prisma generate、prisma db push、npm run seed
 *   2) API 執行中：node dist/main.js  （http://localhost:3000/api）
 * 執行：
 *   node demo/demo.mjs
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

async function main() {
  console.log(`\n=== 教會 APP Demo：auth + 代禱牆審核 (${BASE}) ===\n`);

  // ── 1. 註冊兩位會友 ──
  console.log('1) 註冊會友 A / B（POST /auth/register）');
  const regA = await call('/auth/register', {
    method: 'POST',
    body: {
      email: `alice_${rnd}@church.local`,
      password: 'DemoPassw0rd!',
      displayName: '姊妹 Alice',
    },
  });
  assert(regA.status === 201 && regA.data.accessToken, '會友 A 註冊並取得 access token');
  const aliceToken = regA.data.accessToken;

  const regB = await call('/auth/register', {
    method: 'POST',
    body: {
      email: `bob_${rnd}@church.local`,
      password: 'DemoPassw0rd!',
      displayName: '弟兄 Bob',
    },
  });
  assert(regB.status === 201 && regB.data.accessToken, '會友 B 註冊並取得 access token');
  const bobToken = regB.data.accessToken;

  // ── 2. 管理員登入（seed 建立）──
  console.log('\n2) 管理員登入（POST /auth/login）');
  const admin = await call('/auth/login', {
    method: 'POST',
    body: { email: 'admin@church.local', password: ADMIN_PASSWORD },
  });
  assert(admin.status === 201 && admin.data.accessToken, '管理員登入成功');
  const adminToken = admin.data.accessToken;

  // ── 3. 未帶 token 被擋（AUTH 守衛）──
  console.log('\n3) RBAC / 驗證守衛');
  const noAuth = await call('/prayer/feed');
  assert(noAuth.status === 401, '未登入存取 /prayer/feed 被擋 (401)');

  const bobQueue = await call('/prayer/moderation/queue', { token: bobToken });
  assert(bobQueue.status === 403, '一般會友存取審核佇列被擋 (403)');

  // ── 4. 會友 A 發布「公開」代禱 → 需審核（PENDING）──
  console.log('\n4) 公開代禱需審核（預設 PENDING，未核准不進 feed）');
  const pub = await call('/prayer', {
    method: 'POST',
    token: aliceToken,
    body: { content: '請為我找工作的面試禱告，求主帶領。', visibility: 'PUBLIC' },
  });
  assert(pub.status === 201 && pub.data.moderationStatus === 'PENDING', '公開代禱建立後為 PENDING');
  const pubId = pub.data.id;

  const bobFeed1 = await call('/prayer/feed', { token: bobToken });
  const bobSeesPending = bobFeed1.data.some((p) => p.id === pubId);
  assert(!bobSeesPending, '未審核的公開代禱不出現在其他會友 feed');

  // ── 5. 管理員審核核准 → 其他會友可見 ──
  console.log('\n5) 管理員審核核准');
  const queue = await call('/prayer/moderation/queue', { token: adminToken });
  assert(queue.data.some((p) => p.id === pubId), '待審佇列包含該代禱');

  const approve = await call(`/prayer/${pubId}/moderate`, {
    method: 'POST',
    token: adminToken,
    body: { decision: 'APPROVED' },
  });
  assert(approve.status === 201 && approve.data.moderationStatus === 'APPROVED', '核准成功');

  const bobFeed2 = await call('/prayer/feed', { token: bobToken });
  assert(bobFeed2.data.some((p) => p.id === pubId), '核准後其他會友 feed 可見');

  // ── 6. 匿名發布 + 管理員稽核揭露 ──
  console.log('\n6) 匿名代禱 + 匿名身份稽核（僅 ADMIN，寫入稽核紀錄）');
  const anon = await call('/prayer', {
    method: 'POST',
    token: aliceToken,
    body: { content: '為家庭關係代禱。', visibility: 'PUBLIC', isAnonymous: true },
  });
  await call(`/prayer/${anon.data.id}/moderate`, {
    method: 'POST',
    token: adminToken,
    body: { decision: 'APPROVED' },
  });
  const feedAnon = await call('/prayer/feed', { token: bobToken });
  const anonView = feedAnon.data.find((p) => p.id === anon.data.id);
  assert(
    anonView && anonView.authorId === null && anonView.authorDisplay === '一位弟兄姊妹',
    '匿名貼文對其他人隱藏真實作者（顯示「一位弟兄姊妹」）',
  );

  const bobReveal = await call(`/prayer/${anon.data.id}/reveal`, { method: 'POST', token: bobToken });
  assert(bobReveal.status === 403, '一般會友無法揭露匿名身份 (403)');

  const reveal = await call(`/prayer/${anon.data.id}/reveal`, { method: 'POST', token: adminToken });
  assert(reveal.status === 201 && reveal.data.realUserId, '管理員可稽核揭露真實身份');

  // ── 7. 危機內容自動標記、不公開曝光 ──
  console.log('\n7) 危機內容自動偵測（不公開曝光，優先通報關懷同工）');
  const crisis = await call('/prayer', {
    method: 'POST',
    token: aliceToken,
    body: { content: '我最近很痛苦，甚至有想自殺的念頭。', visibility: 'PUBLIC' },
  });
  assert(
    crisis.data.moderationStatus === 'AUTO_FLAGGED' && crisis.data.escalated === true,
    '危機內容被標記 AUTO_FLAGGED 且 escalated=true',
  );
  const bobFeed3 = await call('/prayer/feed', { token: bobToken });
  assert(!bobFeed3.data.some((p) => p.id === crisis.data.id), '危機內容不出現在公開 feed');

  // ── 8. 發文者自行下架 ──
  console.log('\n8) 發文者自行下架');
  const takedown = await call(`/prayer/${pubId}/takedown`, { method: 'POST', token: aliceToken });
  assert(takedown.status === 201 && takedown.data.takenDownAt, '發文者可下架自己的代禱');
  const bobFeed4 = await call('/prayer/feed', { token: bobToken });
  assert(!bobFeed4.data.some((p) => p.id === pubId), '下架後不再出現在 feed');

  console.log(`\n=== 結果：${pass} 通過 / ${fail} 失敗 ===\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('Demo 執行錯誤：', e);
  process.exit(1);
});
