export default function AuditPage() {
  return (
    <div>
      <h2>稽核紀錄</h2>
      <p className="muted">
        §四.9：誰在何時對什麼做了什麼。重點紀錄敏感操作，例如
        <code>PRAYER_ANONYMITY_REVEAL</code>（揭露匿名身份）、
        <code>EVENT_ROSTER_VIEW</code>（查看出席名單）、角色變更等。
      </p>
      <div className="card">
        <h3>操作紀錄（僅 ADMIN 可見）</h3>
        <p className="muted">串接稽核查詢 API 後以表格呈現：時間、操作者、動作、對象、IP。</p>
      </div>
    </div>
  );
}
