const MODULES = [
  { name: '帳號 / RBAC', desc: '註冊登入、角色權限（會友／小組長／同工／管理員）', stage: '階段一 ✓', href: null },
  { name: '主日崇拜 YouTube', desc: '最新影片預覽與嵌入播放', stage: '階段一 ✓', href: '/livestream' },
  { name: '靈修佳文 (CMS)', desc: '同工上稿、分類、發布／下架', stage: '階段一 ✓', href: '/articles' },
  { name: '牧區・小組', desc: '目錄式介紹資料維護', stage: '階段一 ✓', href: '/groups' },
  { name: '公告推播', desc: '建立公告並發布（FCM 骨架）', stage: '階段一 ✓', href: '/announcements' },
  { name: '活動報名簽到', desc: '名單與動態簽到碼', stage: '階段二', href: '/events' },
  { name: '代禱牆審核', desc: '審核佇列、危機標記', stage: '階段三', href: '/prayer' },
];

export default function DashboardPage() {
  return (
    <div>
      <h2>總覽 — 第一階段 MVP</h2>
      <p className="muted">
        帳號系統・主日崇拜・靈修佳文・牧區小組・基本公告。種子帳號{' '}
        <code>admin@church.local</code> / <code>ChangeMe123456</code>。
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
