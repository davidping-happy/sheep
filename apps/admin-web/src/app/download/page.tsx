/** Prefer API mirror — Expo/GitHub often stall in TW / LINE */
const PRIMARY =
  'https://churchsheep-api.onrender.com/downloads/churchsheep-latest.apk';
const ADMIN_MIRROR = '/downloads/churchsheep-latest.apk';
const GITHUB =
  'https://github.com/davidping-happy/sheep/releases/download/v1.1.8-preview/churchsheep-1.1.8.apk';
const EXPO = GITHUB;
const RELEASE =
  'https://github.com/davidping-happy/sheep/releases/tag/v1.1.8-preview';

export default function DownloadPage() {
  return (
    <div className="card" style={{ maxWidth: 560 }}>
      <h2>成二牧區 App — Android 下載</h2>
      <p className="muted">
        目前版本 <strong>1.1.8</strong>。請用 <strong>Chrome</strong> 開啟本頁（不要用
        LINE 內建瀏覽器）。
      </p>

      <ol style={{ lineHeight: 1.7, paddingLeft: 20 }}>
        <li>點下方「主要下載」</li>
        <li>
          到手機「檔案／下載」點 APK 安裝（可覆蓋舊版）
        </li>
        <li>允許「未知來源」後開啟「成二牧區」</li>
      </ol>

      <p style={{ marginTop: 20 }}>
        <a
          href={PRIMARY}
          style={{
            display: 'inline-block',
            padding: '12px 18px',
            background: 'var(--accent)',
            color: '#fff',
            borderRadius: 10,
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          主要下載（API 鏡射）
        </a>
      </p>

      <h3 style={{ marginTop: 28 }}>若主要連結失敗</h3>
      <ul style={{ lineHeight: 1.8 }}>
        <li>
          <a href={ADMIN_MIRROR}>備用：後台鏡射</a>
        </li>
        <li>
          <a href={EXPO} target="_blank" rel="noreferrer">
            備用：Expo 直連
          </a>
        </li>
        <li>
          <a href={GITHUB} target="_blank" rel="noreferrer">
            備用：GitHub Release
          </a>
        </li>
        <li>
          <a href={RELEASE} target="_blank" rel="noreferrer">
            Release 說明頁
          </a>
        </li>
      </ul>

      <h3 style={{ marginTop: 28 }}>下載卡住時</h3>
      <ul className="muted" style={{ lineHeight: 1.8 }}>
        <li>關掉 LINE，改用 Chrome 重開本頁</li>
        <li>
          進度到 100% 卻一直「下載中」：取消後到「檔案／下載」直接點 APK
        </li>
        <li>改點「主要下載（API 鏡射）」</li>
      </ul>

      <p className="muted" style={{ marginTop: 24 }}>
        iPhone 請用 Safari：{' '}
        <a href="/app/" target="_blank" rel="noreferrer">
          /app/
        </a>
      </p>
    </div>
  );
}
