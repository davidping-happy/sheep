const MODULES = [
  { name: '靈修佳文 (CMS)', desc: '同工上稿、分類管理、發布', stage: '階段一/二' },
  { name: '牧區・小組', desc: '目錄式資料、聯絡資訊揭露控管', stage: '階段一' },
  { name: '活動報名簽到', desc: '建活動、名單匯出、動態 QR 簽到', stage: '階段二/三' },
  { name: '代禱牆審核', desc: '審核佇列、危機通報、匿名稽核', stage: '階段三' },
  { name: '公告推播', desc: '分眾發送 (FCM / LINE)', stage: '階段一/二' },
  { name: '稽核紀錄', desc: '敏感操作留存 (誰在何時做了什麼)', stage: '全期' },
];

export default function DashboardPage() {
  return (
    <div>
      <h2>總覽</h2>
      <p className="muted">
        管理後台骨架。實際頁面資料串接 <code>src/lib/api.ts</code> 呼叫後端 API。
        後台登入建議強制 2FA（系統設計文件 §四.3）。
      </p>
      <div className="grid">
        {MODULES.map((m) => (
          <div className="card" key={m.name}>
            <span className="badge">{m.stage}</span>
            <h3>{m.name}</h3>
            <p className="muted">{m.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
