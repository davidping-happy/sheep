/**
 * Phase 3 煙霧測試：代禱牆（私人／小組／公開審核／匿名／危機）＋動態 QR 簽到
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
    console.log(`  ✘ ${label}`, cond === false ? '' : cond);
  }
}

async function main() {
  console.log(`\n=== Phase 3 煙霧測試 (${BASE}) ===\n`);
  const rnd = Math.random().toString(36).slice(2, 8);

  console.log('0) 登入');
  const login = await call('/auth/login', {
    method: 'POST',
    body: { email: 'admin@church.local', password: ADMIN_PASSWORD },
  });
  assert(login.status === 201 && login.data?.accessToken, '管理員登入');
  const adminToken = login.data?.accessToken;

  const reg = await call('/auth/register', {
    method: 'POST',
    body: {
      email: `p3_${rnd}@church.local`,
      password: 'DemoPassw0rd!',
      displayName: '階段三會友',
    },
  });
  assert(reg.status === 201 && reg.data?.accessToken, '會友註冊');
  const memberToken = reg.data?.accessToken;

  const areas = await call('/groups/areas');
  const groupId = areas.data?.[0]?.groups?.[0]?.id;
  assert(!!groupId, '有示範小組');

  // 會友加入小組（直接透過 prisma 無公開 API 時：用 admin 無法加會員——
  // 若無 join API，小組可見測試改以 admin 已在 seed 入組為主）
  // 嘗試：若有 group membership 僅 seed 給 admin，會友 GROUP 會失敗——改測 admin 小組貼文

  console.log('\n1) 代禱牆 — 私人／公開審核／匿名／危機');
  const priv = await call('/prayer', {
    method: 'POST',
    token: memberToken,
    body: { content: `私人代禱 ${rnd}`, visibility: 'PRIVATE' },
  });
  assert(
    priv.status === 201 &&
      priv.data?.visibility === 'PRIVATE' &&
      priv.data?.moderationStatus === 'APPROVED',
    '建立私人代禱',
  );

  const staffFeed = await call('/prayer/feed', { token: adminToken });
  assert(
    staffFeed.status === 200 &&
      staffFeed.data?.some((p) => p.id === priv.data.id),
    '同工 feed 可見會友私人代禱',
  );

  const pub = await call('/prayer', {
    method: 'POST',
    token: memberToken,
    body: {
      content: `公開代禱 ${rnd}`,
      visibility: 'PUBLIC',
      isAnonymous: true,
    },
  });
  assert(
    pub.status === 201 && pub.data?.moderationStatus === 'PENDING',
    '公開＋匿名 → PENDING',
  );

  const memberFeedBefore = await call('/prayer/feed', { token: memberToken });
  assert(
    memberFeedBefore.data?.some((p) => p.id === pub.data.id),
    '作者可見自己的待審公開文',
  );
  const otherFeed = await call('/prayer/feed', { token: adminToken });
  // admin 作為同工可見私人；公開 PENDING 不應在一般 OR 的 PUBLIC APPROVED——
  // 但作者條件會讓 admin 看不到別人的 PENDING（非作者）
  assert(
    !otherFeed.data?.some(
      (p) =>
        p.id === pub.data.id &&
        p.moderationStatus === 'PENDING' &&
        !p.isOwner,
    ),
    '他人 feed 不顯示未核准公開文（非作者視角）',
  );

  const queue = await call('/prayer/moderation/queue', { token: adminToken });
  assert(
    queue.status === 200 && queue.data?.some((p) => p.id === pub.data.id),
    '審核佇列含公開文',
  );

  const approved = await call(`/prayer/${pub.data.id}/moderate`, {
    method: 'POST',
    token: adminToken,
    body: { decision: 'APPROVED' },
  });
  assert(approved.status === 201 || approved.status === 200, '核准公開文');

  const feedAfter = await call('/prayer/feed', { token: adminToken });
  const approvedItem = feedAfter.data?.find((p) => p.id === pub.data.id);
  assert(
    approvedItem &&
      approvedItem.isAnonymous &&
      approvedItem.authorId === null &&
      approvedItem.authorDisplay === '一位弟兄姊妹',
    '核准後匿名顯示',
  );

  const reveal = await call(`/prayer/${pub.data.id}/reveal`, {
    method: 'POST',
    token: adminToken,
  });
  assert(
    reveal.status === 201 && reveal.data?.realUserId,
    'ADMIN 揭示匿名身份',
  );

  const crisis = await call('/prayer', {
    method: 'POST',
    token: memberToken,
    body: { content: `我有自殺的念頭 ${rnd}`, visibility: 'PUBLIC' },
  });
  assert(
    crisis.status === 201 &&
      crisis.data?.moderationStatus === 'AUTO_FLAGGED' &&
      crisis.data?.escalated === true,
    '危機內容 AUTO_FLAGGED',
  );

  const resp = await call(`/prayer/${priv.data.id}/respond`, {
    method: 'POST',
    token: adminToken,
    body: { showIdentity: false },
  });
  assert(resp.status === 201 || resp.status === 200, '同工「我已代禱」');

  const report = await call(`/prayer/${priv.data.id}/report`, {
    method: 'POST',
    token: adminToken,
    body: { reason: '測試檢舉' },
  });
  assert(report.status === 201 || report.status === 200, '檢舉');

  // 小組可見（admin 在 seed 已入組）
  if (groupId) {
    const gPost = await call('/prayer', {
      method: 'POST',
      token: adminToken,
      body: {
        content: `小組代禱 ${rnd}`,
        visibility: 'GROUP',
        sharedGroupId: groupId,
      },
    });
    assert(
      gPost.status === 201 && gPost.data?.visibility === 'GROUP',
      '小組可見代禱',
    );
  }

  console.log('\n2) 動態 QR 簽到');
  const start = new Date();
  start.setDate(start.getDate() + 3);
  const ev = await call('/events', {
    method: 'POST',
    token: adminToken,
    body: {
      title: `階段三簽到 ${rnd}`,
      location: '大堂',
      startAt: start.toISOString(),
      capacity: 20,
    },
  });
  assert(ev.status === 201 && ev.data?.id, '建立活動');
  const eventId = ev.data.id;

  const noRegCheckin = await call(`/events/${eventId}/checkin`, {
    method: 'POST',
    token: memberToken,
    body: { token: 'dummy' },
  });
  // 可能先因 token 無效或未報名失敗
  assert(noRegCheckin.status >= 400, '未報名／無效碼不可簽到');

  const r1 = await call(`/events/${eventId}/register`, {
    method: 'POST',
    token: memberToken,
    body: {},
  });
  assert(r1.status === 201 && r1.data?.status === 'REGISTERED', '會友報名');

  const tok1 = await call(`/events/${eventId}/checkin-token`, {
    method: 'POST',
    token: adminToken,
  });
  assert(
    tok1.status === 201 &&
      tok1.data?.token &&
      tok1.data?.payload &&
      tok1.data?.ttlSeconds === 30,
    '核發動態 token＋payload',
  );

  const tok2 = await call(`/events/${eventId}/checkin-token`, {
    method: 'POST',
    token: adminToken,
  });
  assert(tok2.status === 201 && tok2.data?.token !== tok1.data?.token, '輪替換碼');

  const oldCheck = await call(`/events/${eventId}/checkin`, {
    method: 'POST',
    token: memberToken,
    body: { token: tok1.data.token },
  });
  assert(oldCheck.status >= 400, '舊碼已失效');

  const okCheck = await call(`/events/${eventId}/checkin`, {
    method: 'POST',
    token: memberToken,
    body: { token: tok2.data.payload },
  });
  assert(okCheck.status === 201 || okCheck.status === 200, '新碼／payload 簽到成功');

  const roster = await call(`/events/${eventId}/roster`, { token: adminToken });
  const row = roster.data?.find((r) => r.status === 'REGISTERED');
  assert(
    roster.status === 200 && row?.checkedIn === true,
    '名單顯示已簽到',
  );

  console.log(`\n=== 結果：${pass} 通過 / ${fail} 失敗 ===\n`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
