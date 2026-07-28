/**
 * Phase 1 MVP 煙霧測試：帳號、YouTube、佳文、小組、公告
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
    console.log(`  ✘ ${label}`, typeof cond === 'object' ? cond : '');
  }
}

async function main() {
  console.log(`\n=== Phase 1 MVP 煙霧測試 (${BASE}) ===\n`);

  console.log('1) 帳號系統');
  const login = await call('/auth/login', {
    method: 'POST',
    body: { email: 'admin@church.local', password: ADMIN_PASSWORD },
  });
  assert(login.status === 201 && login.data?.accessToken, '管理員登入');
  const token = login.data?.accessToken;

  const rnd = Math.random().toString(36).slice(2, 8);
  const reg = await call('/auth/register', {
    method: 'POST',
    body: {
      email: `mvp_${rnd}@church.local`,
      password: 'DemoPassw0rd!',
      displayName: 'MVP會友',
    },
  });
  assert(reg.status === 201 && reg.data?.accessToken, '會友註冊');

  console.log('\n2) 主日崇拜 YouTube');
  const yt = await call('/livestream/latest');
  assert(
    yt.status === 200 && yt.data?.videoId && yt.data?.embedUrl,
    `最新影片 ${yt.data?.source || ''} ${yt.data?.title?.slice(0, 20) || ''}`,
  );

  console.log('\n3) 靈修佳文');
  const articles = await call('/articles');
  assert(articles.status === 200 && articles.data?.length >= 1, `公開列表 ${articles.data?.length} 篇`);
  const slug = articles.data?.[0]?.slug;
  const detail = await call(`/articles/${slug}`);
  assert(detail.status === 200 && detail.data?.body, '內容頁');
  const manage = await call('/articles/manage', { token });
  assert(manage.status === 200 && Array.isArray(manage.data), '後台 manage 列表');

  console.log('\n4) 牧區／小組');
  const areas = await call('/groups/areas');
  assert(areas.status === 200 && areas.data?.length >= 1, '牧區列表');
  const gid = areas.data?.[0]?.groups?.[0]?.id;
  const group = await call(`/groups/${gid}`);
  assert(group.status === 200 && group.data?.name, '小組詳情');

  console.log('\n5) 公告');
  const anns = await call('/announcements');
  assert(anns.status === 200 && anns.data?.length >= 1, `已發布公告 ${anns.data?.length}`);
  const created = await call('/announcements', {
    method: 'POST',
    token,
    body: { title: `MVP測試公告 ${rnd}`, body: '測試內容', audience: 'ALL' },
  });
  assert(created.status === 201 && created.data?.id, '建立公告');
  const pub = await call(`/announcements/${created.data.id}/publish`, {
    method: 'POST',
    token,
  });
  assert(pub.status === 201 && pub.data?.isPublished, '發布／推播骨架');

  console.log(`\n=== 結果：${pass} 通過 / ${fail} 失敗 ===\n`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
