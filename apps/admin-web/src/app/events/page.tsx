export default function EventsPage() {
  return (
    <div>
      <h2>活動報名簽到</h2>
      <p className="muted">
        建立活動、檢視報名名單、匯出出席資料。出席名單屬行蹤資料，
        僅主辦同工／管理員可查（§6.1 / §四.8），存取會寫入稽核紀錄。
      </p>
      <div className="card">
        <h3>活動列表</h3>
        <p className="muted">
          串接 <code>GET /events</code>；名單 <code>GET /events/:id/roster</code>；
          現場簽到用動態 QR（<code>POST /events/:id/checkin-token</code>）。
        </p>
      </div>
    </div>
  );
}
