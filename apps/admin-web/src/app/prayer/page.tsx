export default function PrayerModerationPage() {
  return (
    <div>
      <h2>代禱牆審核</h2>
      <p className="muted">
        對應系統設計文件 §6.2。審核佇列來自 <code>GET /prayer/moderation/queue</code>
        （需 STAFF 以上或代禱牆管理同工）。
      </p>

      <div className="card">
        <h3>審核原則</h3>
        <ul className="muted">
          <li>公開範圍內容需<strong>發布前人工審核</strong>；私人／小組可見可略過。</li>
          <li>
            危機類內容（自傷／家暴／精神危機）由系統自動標記
            <span className="badge">AUTO_FLAGGED</span>，
            <strong>不公開曝光</strong>，優先通報牧者／關懷同工。
          </li>
          <li>
            匿名貼文的真實身份需<strong>系統管理員</strong>透過
            <code>POST /prayer/:id/reveal</code> 才能稽核，且必留稽核紀錄。
          </li>
        </ul>
      </div>

      <div className="card">
        <h3>待審核佇列（骨架）</h3>
        <p className="muted">
          串接後以列表呈現：內容摘要、可見範圍、敏感分類、檢舉次數、
          「核准／退回」操作。
        </p>
      </div>
    </div>
  );
}
