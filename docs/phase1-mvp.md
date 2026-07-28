# 第一階段 MVP 使用說明

對應系統設計文件第六章「第一階段」。

## 功能清單

| 功能 | 行動端 | 管理後台 | API |
|---|---|---|---|
| 帳號註冊／登入／RBAC | ✓ 登入畫面 | ✓ 各頁登入 | ✓ |
| 主日崇拜 YouTube | ✓ 播放／開啟 | ✓ `/livestream` 預覽 | ✓ `/livestream/latest` |
| 靈修佳文 | ✓ 列表＋內容 | ✓ `/articles` CMS | ✓ |
| 牧區／小組 | ✓ 目錄＋詳情 | ✓ `/groups` | ✓ |
| 基本公告推播 | ✓ 列表 | ✓ `/announcements` | ✓（FCM 為骨架）|

## 啟動

```powershell
# API
cd apps\api
npm run build
node dist\main.js

# 種子（首次或更新示範內容）
npm run seed

# 後台
cd ..\admin-web
npm run dev
# http://localhost:3001

# 行動端（瀏覽器最簡單）
cd ..\mobile
npx expo start --web
# http://localhost:8081
```

帳號：`admin@church.local`（密碼以 `npm run set-password` 設定）

## YouTube 正式頻道

在 `apps/api/.env`：

```
YOUTUBE_API_KEY=你的金鑰
YOUTUBE_CHANNEL_ID=你的頻道ID
```

未設定時會顯示示範影片，不影響其他 MVP 功能。

## 驗證腳本

```powershell
cd apps\api
node demo\demo-phase1.mjs
```
