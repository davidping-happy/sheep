import { API_BASE } from '../lib/api';

const MODULES = [
  { name: '帳號 / RBAC', desc: '註冊登入、角色權限', stage: '階段一 ✓', href: null },
  { name: '主日崇拜 YouTube', desc: '最新影片預覽與嵌入播放', stage: '階段一 ✓', href: '/livestream' },
  { name: '靈修佳文 (CMS)', desc: '草稿、編輯、預覽、發布／下架', stage: '階段二 ✓', href: '/articles' },
  { name: '牧區・小組', desc: '目錄式介紹資料維護', stage: '階段一 ✓', href: '/groups' },
  { name: '公告分眾推播', desc: '全牧區／小組／角色（FCM stub）', stage: '階段二 ✓', href: '/announcements' },
  { name: '活動報名簽到', desc: '動態 QR 輪替、名單簽到狀態、CSV', stage: '階段三 ✓', href: '/events' },
  { name: '代禱牆審核', desc: '公開審核、危機標記、匿名稽核', stage: '階段三 ✓', href: '/prayer' },
];

export default function DashboardPage() {
  return (
    <div>
      <h2>總覽 — 成二牧區</h2>
      <p className="muted">
        溫馨家庭風後台。管理員帳號 <code>admin@church.local</code>
        （密碼為 Render 部署時的 <code>SEED_ADMIN_PASSWORD</code>，或雲端 DB 執行{' '}
        <code>npm run set-password</code> 後的值）。
      </p>
      <p className="muted">
        目前 API：{' '}
        <a href={API_BASE.replace(/\/api$/, '/api/health')} target="_blank" rel="noreferrer">
          {API_BASE}
        </a>
      </p>
      <div className="grid">
        {MODULES.map((m) => (
          <a
            key={m.name}
            className="card"
            href={m.href ?? undefined}
            style={{
              textDecoration: 'none',
              color: 'inherit',
              display: 'block',
            }}
          >
            <span className="badge">{m.stage}</span>
            <h3>{m.name}</h3>
            <p className="muted">{m.desc}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
