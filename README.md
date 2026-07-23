# 教會 APP（churchsheep）

內容整合 + 個人化牧養工具。自建 / 半自建架構，強調**原始碼所有權**與**資料自主權**（相較 Subsplash / Tithe.ly 等 SaaS）。

> 完整系統設計文件見 [`docs/system-design.md`](docs/system-design.md)。

## 系統架構

![系統架構圖](docs/architecture.png)

```
使用者端 App (iOS / Android / 管理後台 Web)
        │
   API Gateway・身份驗證 (OAuth2 / JWT / RBAC)
        │
   核心服務層 (七大功能模組)
        │
   資料層 (PostgreSQL) + 物件儲存 + 第三方整合 (YouTube / FCM / LINE)
```

## Monorepo 結構

```
churchsheep/
├── apps/
│   ├── api/          # 後端 API — NestJS + Prisma (核心服務層)
│   ├── admin-web/    # 管理後台 CMS — Next.js (同工上稿 / 推播 / 審核)
│   └── mobile/       # 行動端 App — React Native (會友端)
├── packages/
│   └── shared/       # 跨端共用：RBAC 角色、列舉、DTO 型別
└── docs/             # 設計文件與架構圖
```

## 七大核心功能

| # | 功能 | 模組 (api) | 隱私等級 |
|---|---|---|---|
| 1 | 晨禱靈修筆記 | `devotions` | 高（個人資料，欄位加密、預設不公開）|
| 2 | 主日崇拜 YouTube 連結 | `livestream` | 低 |
| 3 | 靈修佳文分享 | `articles` | 低（CMS 上稿）|
| 4 | 牧區領袖・小組介紹 | `groups` | 中（聯絡資訊需同意才揭露）|
| 5 | 牧區最新資訊 / 公告推播 | `announcements` | 低〜中（分眾）|
| 6 | 活動報名與簽到 | `events` | 中〜高（出席/行蹤紀錄，限主辦同工）|
| 7 | 禱告代禱牆 | `prayer` | **最高**（特種個資、匿名追溯、審核佇列）|

## 技術棧

| 層級 | 技術 |
|---|---|
| 行動端 | React Native |
| 管理後台 | React / Next.js |
| 後端 API | Node.js / NestJS（REST）|
| 資料庫 | PostgreSQL（Prisma ORM）|
| 物件儲存 | AWS S3 / GCP Cloud Storage |
| 推播 | Firebase Cloud Messaging（+ 選用 LINE Notify）|
| 影音 | YouTube Data API v3 |
| 資安 | OWASP MASVS 2026 + MobSF（納入 CI/CD）|

## 快速開始

### 第一次建置（裝套件 + 資料庫 + 編譯）

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-all.ps1
```

### 日常開發／重開機後啟動

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-dev.ps1
```

然後開啟：
- 後台審核：http://localhost:3001/prayer（`admin@church.local` / `ChangeMe123456`）
- API 文件：http://localhost:3000/docs

停止本機服務：`.\scripts\stop-dev.ps1`

### 手動分步（等同 setup-all，方便理解每一步）

```bash
# ── 後端 API ──
cd apps/api
cp .env.example .env          # 密鑰與資料庫路徑（不進 git）
npm install --no-workspaces   # 下載 NestJS / Prisma 等
npm run prisma:generate       # 產生資料庫客戶端程式碼
npm run prisma:push           # 建立 SQLite 資料表（本地 demo）
npm run seed                  # 建立管理員與範例牧區
npm run build && node dist/main.js

# 驗證
node demo/demo.mjs
node demo/demo-events.mjs

# ── 管理後台 ──
cd ../admin-web
cp .env.example .env.local
npm install --no-workspaces
npm run dev                   # http://localhost:3001/prayer

# ── 行動端（會友 App 骨架）──
cd ../mobile
npm install --no-workspaces
npm start                     # Expo；手機裝 Expo Go 掃碼
```

## 開發階段（對應設計文件第六章）

- **階段一 (MVP)**：帳號/RBAC、YouTube 連結、靈修佳文、小組介紹、基本推播
- **階段二**：晨禱筆記（雲端同步＋提醒）、後台 CMS、分眾推播、活動報名（先後台名單匯出）
- **階段三**：禱告代禱牆（**先上線「私人 / 小組可見」＋審核機制**，公開牆與匿名後行）、動態 QR Code 簽到
- **階段四**：奉獻（獨立評估金流與資安等級）

## 資安基線

所有模組遵循 [`docs/system-design.md`](docs/system-design.md) 第四章（OWASP MASVS 2026 + 台灣個資法）。重點：
- 敏感欄位（晨禱筆記、代禱匿名對應）伺服器端 AES-256 加密，與一般內容分表儲存
- OAuth2/OIDC + 短效期 JWT + refresh token；後台強制 2FA
- RBAC 最小權限：小組長只能管自己小組；出席名單僅主辦同工可見
- 後台操作寫入 `audit_logs` 稽核紀錄
