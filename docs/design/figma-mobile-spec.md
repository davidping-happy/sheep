# 成二牧區 App — Figma 行動端設計規格

> 品牌：**成二牧區**（勿用「教會」作 App 名稱）  
> 風格：**溫馨家庭風** — 暖紙色＋陶土橘＋柔綠  
> 原則：簡潔、大按鈕、少層級。

## 色票

| Token | 色碼 | 用途 |
|---|---|---|
| bg | `#FBF6F0` | 頁面底（暖紙） |
| brand | `#C46B4A` | 主按鈕／連結（陶土） |
| secondary | `#6B8F71` | 副標／柔和強調（柔綠） |
| ink | `#3D2C29` | 正文（墨棕） |
| brandSoft | `#F6E6DE` | Chip 選中底 |

副標文案：**我們的屬靈家庭**

| 品牌 | 「成二牧區」為首屏主視覺；副標「我們的屬靈家庭」 |
| 氛圍 | 溫馨家庭風 — 暖紙色＋陶土橘＋柔綠 |
| 操作 | 一屏一件事；點擊區 ≥ 48pt；避免儀表板式資訊堆疊 |
| 字型 | 品牌：Noto Serif TC；內文／按鈕：Noto Sans TC |
| 忌用 | 紫色漸層、霓虹光暈、用「教會」當 App 名稱 |

### 色票（對應 `tokens.json`）

- 背景 `#FBF6F0`｜陶土 `#C46B4A`｜柔綠 `#6B8F71`｜墨棕 `#3D2C29`

```
登入／註冊  →  JWT（Auth）
     ↓
首頁樞紐 Home（七大功能入口，對應階段一～三）
     ├─ 主日崇拜      → /livestream/latest
     ├─ 晨禱筆記      → /devotions
     ├─ 靈修佳文      → /articles
     ├─ 牧區・小組    → /groups/areas
     ├─ 最新資訊      → /announcements
     ├─ 活動報名簽到  → /events + checkin
     └─ 禱告代禱牆    → /prayer/feed
```

後台（另開 Web `:3001`）不塞進行動端 Tab：CMS、分眾推播、審核、現場 QR 輪播。

**導航模式**：Stack + 首頁樞紐（現況一致）。不建議底部 5+ Tab（會友認知負擔大）。

---

## 3. Figma 檔案結構（請照此建 Frame）

```
📄 教會APP_Mobile_v1
 ├─ 🎨 Cover
 ├─ 🎨 Foundations（色／字／間距／元件）
 ├─ 📱 Flows
 │   ├─ 01 Login / Register
 │   ├─ 02 Home Hub
 │   ├─ 03 Livestream
 │   ├─ 04 Devotions
 │   ├─ 05 Articles → Detail
 │   ├─ 06 Groups → Detail
 │   ├─ 07 Announcements
 │   ├─ 08 Events → Check-in sheet
 │   └─ 09 Prayer Wall
 └─ 🧩 Components
     ├─ Button / Primary｜Ghost
     ├─ Input
     ├─ Chip（可見範圍）
     ├─ ListRow（首頁入口）
     ├─ FeedCard（代禱／公告）
     └─ NavHeader
```

**Frame 尺寸**：iPhone 14/15 — `390 × 844`。Auto Layout：垂直、padding 16、item spacing 12。

---

## 4. 關鍵畫面（對應 mockups）

| Frame | 檔案 | 與運作對齊 |
|---|---|---|
| 登入 | `mockups/figma-login.png` | `/auth/login` `/auth/register`；密碼 ≥10 |
| 首頁 | `mockups/figma-home.png` | 七入口；登出在 header |
| 主日崇拜 | `mockups/figma-livestream.png` | YouTube embed／外開 |
| 代禱牆 | `mockups/figma-prayer.png` | 私人／小組／公開＋審核；我已代禱／檢舉 |
| 活動簽到 | `mockups/figma-events.png` | 先報名再簽到；貼上動態碼／payload |

### 4.1 登入（簡潔）

1. 品牌名（Serif 34）  
2. 一句副標  
3. Email、密碼  
4. 單一主按鈕「登入」  
5. 次要文字鏈「註冊」  

禁止：社群登入列、行銷 banner。

### 4.2 首頁樞紐

- 品牌仍在首屏上方  
- **ListRow**：左標題＋右短說明，整列可點  
- 順序建議（常用優先）：主日崇拜 → 代禱 → 活動 → 晨禱 → 佳文 → 小組 → 公告  

### 4.3 代禱牆（隱私優先）

- 上方發布區固定；下方 feed  
- Chip：私人（預設）／小組／公開（需審核提示）  
- 匿名開關單獨一列，文案清楚  
- 列表動作最多兩個：我已代禱、檢舉（自己的顯示下架）  

### 4.4 活動＋簽到

- 列表：時間／地點純文字，狀態一句  
- 主操作：報名｜現場簽到  
- Sheet：大輸入框＋「確認簽到」；說明「須已報名・碼約 30 秒更新」  

### 4.5 後台現場 QR（Web，另 Frame `Desktop / events`）

- 390 以外另開 `1280` Desktop：左側名單、右側大 QR＋倒數  
- 對應 `/events/:id/checkin-token` 自動輪替  

---

## 5. 元件規格（Figma Components）

| 元件 | 規格 |
|---|---|
| Primary Button | H 48、圓角 12、填色 brand、字 16 Medium、白字 |
| Ghost Button | H 48、邊框 border、字 ink |
| Input | H 48、圓角 8、邊框 1、內距 12 |
| Chip | H 36、pill、未選 border／選中 brandSoft＋brand 字 |
| ListRow | H ≥ 64、左右 16、底部分隔線 |
| Header | H 56、返回＋標題置中 |

---

## 6. 在 Figma 快速重建步驟

1. 新建檔 → 建立 Variables，匯入或手動填入 `tokens.json` 色與字級  
2. 安裝字型 Noto Serif TC / Noto Sans TC  
3. 用 `mockups/*.png` 置入對應 Frame 當 Reference（降低透明度 30% 描摹）或直接當視覺基準  
4. 建 Components → 套用到 Flows  
5. Prototype：登入 → 首頁 → 各功能；代禱公開路徑連到「審核中」狀態  

**Tokens Studio**：Plugins → Tokens Studio → Import `docs/design/tokens.json`。

---

## 7. 實作對照（之後套 UI）

| Token | RN / 現況建議 |
|---|---|
| `color.brand` | 取代現有 `#4f46e5` indigo |
| `color.bg` | Home / Prayer 根背景 |
| `font.display` | 登入與 Home 品牌 |
| `sizing.tapMin` | 所有 Pressable minHeight 48 |

畫面稿定稿後，可再依此規格改 `apps/mobile` 與 `apps/admin-web` 主題色。
