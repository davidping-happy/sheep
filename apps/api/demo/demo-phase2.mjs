/**
 * Phase 2 煙霧測試：晨禱筆記、CMS 編輯、分眾推播、活動報名
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
  console.log(`\n=== Phase 2 煙霧測試 (${BASE}) ===\n`);
  const rnd = Math.random().toString(36).slice(2, 8);

  console.log('0) 登入');
  const login = await call('/auth/login', {
    method: 'POST',
    body: { email: 'admin@church.local', password: ADMIN_PASSWORD },
  });
  assert(login.status === 201 && login.data?.accessToken, '管理員登入');
  const token = login.data?.accessToken;

  const reg = await call('/auth/register', {
    method: 'POST',
    body: {
      email: `p2_${rnd}@church.local`,
      password: 'DemoPassw0rd!',
      displayName: '階段二會友',
    },
  });
  assert(reg.status === 201 && reg.data?.accessToken, '會友註冊');
  const memberToken = reg.data?.accessToken;

  console.log('\n1) 晨禱靈修筆記（加密）');
  const note = await call('/devotions', {
    method: 'POST',
    token: memberToken,
    body: {
      noteDate: new Date().toISOString().slice(0, 10),
      scriptureRef: '詩篇 23:1',
      content: `階段二測試筆記 ${rnd}`,
      visibility: 'PRIVATE',
    },
  });
  assert(note.status === 201 && note.data?.content?.includes(rnd), '建立私人筆記並解密回傳');
  const list = await call('/devotions', { token: memberToken });
  assert(list.status === 200 && list.data?.some((n) => n.id === note.data.id), '我的筆記列表');
  const shared = await call('/devotions/shared', { token: memberToken });
  assert(shared.status === 200 && Array.isArray(shared.data), '小組分享列表');
  const patched = await call(`/devotions/${note.data.id}`, {
    method: 'PATCH',
    token: memberToken,
    body: { content: `更新 ${rnd}` },
  });
  assert(patched.status === 200 && patched.data?.content?.includes('更新'), '更新筆記');
  const del = await call(`/devotions/${note.data.id}`, {
    method: 'DELETE',
    token: memberToken,
  });
  assert(del.status === 200 && del.data?.deleted, '刪除筆記');

  console.log('\n2) CMS 草稿／編輯／發布');
  const slug = `p2-article-${rnd}`;
  const draft = await call('/articles', {
    method: 'POST',
    token,
    body: {
      title: `階段二草稿 ${rnd}`,
      slug,
      body: '草稿內文',
      category: 'DAILY_BREAD',
      isPublished: false,
    },
  });
  assert(draft.status === 201 && draft.data?.isPublished === false, '建立草稿');
  const manageOne = await call(`/articles/manage/${draft.data.id}`, { token });
  assert(manageOne.status === 200 && manageOne.data?.body === '草稿內文', '後台讀取單篇');
  const edited = await call(`/articles/${draft.data.id}`, {
    method: 'PATCH',
    token,
    body: { body: '已編輯內文', isPublished: true },
  });
  assert(edited.status === 200 && edited.data?.isPublished === true, '編輯並發布');
  const pubRead = await call(`/articles/${slug}`);
  assert(pubRead.status === 200 && pubRead.data?.body === '已編輯內文', '公開頁可見');

  console.log('\n3) 分眾推播');
  const areas = await call('/groups/areas');
  assert(areas.status === 200 && areas.data?.length >= 1, '牧區資料');
  const areaId = areas.data[0].id;
  const groupId = areas.data[0].groups?.[0]?.id;

  const previewAll = await call('/announcements/preview-audience', {
    method: 'POST',
    token,
    body: { title: 'x', body: 'y', audience: 'ALL' },
  });
  assert(
    previewAll.status === 201 && previewAll.data?.userCount >= 1,
    `預估全教會 ${previewAll.data?.userCount} 人`,
  );

  const previewRole = await call('/announcements/preview-audience', {
    method: 'POST',
    token,
    body: { title: 'x', body: 'y', audience: 'ROLE', targetRole: 'ADMIN' },
  });
  assert(
    previewRole.status === 201 && previewRole.data?.userCount >= 1,
    `預估 ADMIN 角色 ${previewRole.data?.userCount} 人`,
  );

  const annBody = {
    title: `分眾測試 ${rnd}`,
    body: '給小組',
    audience: groupId ? 'GROUP' : 'PASTORAL_AREA',
    ...(groupId ? { targetGroupId: groupId } : { pastoralAreaId: areaId }),
  };
  const ann = await call('/announcements', {
    method: 'POST',
    token,
    body: annBody,
  });
  assert(ann.status === 201 && ann.data?.id, '建立分眾公告');
  const pub = await call(`/announcements/${ann.data.id}/publish`, {
    method: 'POST',
    token,
  });
  assert(
    pub.status === 201 &&
      pub.data?.isPublished &&
      typeof pub.data?.push?.userCount === 'number',
    `發布並回傳推播人數 ${pub.data?.push?.userCount}`,
  );

  const device = await call('/devices/register', {
    method: 'POST',
    token: memberToken,
    body: { fcmToken: `stub-token-${rnd}`, platform: 'web' },
  });
  assert(device.status === 201 || device.status === 200, '裝置 token 註冊');

  console.log('\n4) 活動報名');
  const start = new Date();
  start.setDate(start.getDate() + 14);
  const ev = await call('/events', {
    method: 'POST',
    token,
    body: {
      title: `階段二活動 ${rnd}`,
      location: '大堂',
      startAt: start.toISOString(),
      capacity: 2,
    },
  });
  assert(ev.status === 201 && ev.data?.id, '建立活動');
  const eventId = ev.data.id;

  const r1 = await call(`/events/${eventId}/register`, {
    method: 'POST',
    token: memberToken,
    body: {},
  });
  assert(
    r1.status === 201 && r1.data?.status === 'REGISTERED',
    '會友報名成功',
  );

  const mine = await call('/events/mine', { token: memberToken });
  assert(
    mine.status === 200 && mine.data?.some((r) => r.eventId === eventId),
    '我的報名列表',
  );

  const roster = await call(`/events/${eventId}/roster`, { token });
  assert(
    roster.status === 200 && roster.data?.length >= 1,
    `後台名單 ${roster.data?.length} 人`,
  );

  const cancel = await call(`/events/${eventId}/cancel`, {
    method: 'POST',
    token: memberToken,
  });
  assert(cancel.status === 201 || cancel.status === 200, '取消報名');

  console.log(`\n=== 結果：${pass} 通過 / ${fail} 失敗 ===\n`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
