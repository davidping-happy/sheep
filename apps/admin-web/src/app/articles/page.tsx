export default function ArticlesPage() {
  return (
    <div>
      <h2>靈修佳文 (CMS)</h2>
      <p className="muted">
        同工上稿介面骨架。串接 <code>POST /articles</code>（STAFF 以上）、
        支援分類（每日靈糧／牧者專欄）與草稿／發布切換。
      </p>
      <div className="card">
        <h3>文章列表</h3>
        <p className="muted">串接 <code>GET /articles</code> 後以表格呈現，含發布狀態。</p>
      </div>
    </div>
  );
}
