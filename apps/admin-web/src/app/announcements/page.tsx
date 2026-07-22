export default function AnnouncementsPage() {
  return (
    <div>
      <h2>公告推播</h2>
      <p className="muted">
        建立公告並分眾推播（全教會／牧區／小組／角色）。串接
        <code>POST /announcements</code> 與 <code>POST /announcements/:id/publish</code>
        （透過 FCM，選用 LINE Notify）。
      </p>
      <div className="card">
        <h3>公告列表</h3>
        <p className="muted">串接 <code>GET /announcements</code>。</p>
      </div>
    </div>
  );
}
