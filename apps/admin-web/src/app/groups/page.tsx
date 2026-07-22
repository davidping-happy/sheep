export default function GroupsPage() {
  return (
    <div>
      <h2>牧區・小組</h2>
      <p className="muted">
        目錄式資料管理。聯絡資訊 <code>contactVisible</code> 預設關閉，
        需當事人同意才揭露（§四.8）。小組長僅能編輯自己帶領的小組。
      </p>
      <div className="card">
        <h3>牧區與小組</h3>
        <p className="muted">串接 <code>GET /groups/areas</code>。</p>
      </div>
    </div>
  );
}
