# 行動端：登入＋代禱牆（超簡操作）

**預設已連雲端 API**（不必再開本機通道）：

- API：https://churchsheep-api.onrender.com/api
- 健康檢查：https://churchsheep-api.onrender.com/api/health
- 後台（本機啟動）：http://localhost:3001 → 同樣打雲端 API

---

## 方式 A：用電腦瀏覽器試（不用手機）

### 1. 確認雲端 API
瀏覽器打開：

https://churchsheep-api.onrender.com/api/health

應看到 `{"ok":true,...}`（第一次可能等 30～60 秒喚醒）。

### 2. 啟動行動端
```powershell
cd c:\Users\User\Desktop\churchsheep\apps\mobile
npx expo start --web
```

### 3. 註冊／登入
1. 看到「成二牧區」登入畫面
2. 點「還沒有帳號？註冊」
3. 密碼**至少 6 個字**
4. 點「註冊」

### 4. 逛首頁與代禱牆
1. 底部有 **首頁／我的最愛／個人中心／更多**
2. 首頁點 **「禱告代禱牆」** 發布代禱

公開代禱到後台審核（雲端，電腦可關機）：

https://churchsheep-admin.onrender.com/prayer

（若尚未部署後台，本機可跑 `cd apps\admin-web; npm run dev` → http://localhost:3001/prayer）

用 `admin@church.local` 登入（密碼為 Render 的 `SEED_ADMIN_PASSWORD`）。

---

## 方式 B：Android／iPhone 給別人測試

完整連結見 **[TEST-LINKS.md](./TEST-LINKS.md)**。

| 系統 | 怎麼測 |
|------|--------|
| Android | GitHub Release 下載 APK（Chrome，勿用 LINE 內建瀏覽器） |
| iPhone | Safari 開網頁版（不必 Expo Go／不必 Expo 帳號） |

iPhone（Safari）：  
https://churchsheep-admin.onrender.com/app/

Android APK：  
https://github.com/davidping-happy/sheep/releases/download/v1.1.0-preview/churchsheep-1.1.0.apk

舊版 APK 若連不上，到「更多 → 伺服器連線設定」貼：

```
https://churchsheep-api.onrender.com
```

---

## 方式 C：本機 API（進階開發）

若要改打本機後端：

1. 本機 PostgreSQL：`npm run db:up`（需 Docker）
2. `apps/api` 執行 migrate / seed / `node dist/main.js`
3. 行動端在「伺服器連線設定」改成 `http://你的區網IP:3000/api`
4. 後台在 `apps/admin-web/.env.local` 設：

```
NEXT_PUBLIC_API_BASE=http://localhost:3000/api
```

---

## 常見問題

| 狀況 | 怎麼辦 |
|---|---|
| 第一次很慢 | Render 免費方案休眠，等 30～60 秒 |
| 後台登入失敗 | 確認雲端已 seed；或對雲端 DB 跑 `npm run set-password` |
| 密碼太短被拒 | 密碼至少 6 字元 |
| 想改回本機 API | 見上方「方式 C」 |
