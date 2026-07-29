# 24 小時對外測試：把 API 放到雲端（不必再開通道、電腦可關機／休眠）

## 為什麼通道會斷？

`npm run public:api` 與 Expo 都跑在**你的電腦**上。休眠、關機、關掉視窗，
網址就失效。要讓測試者不受影響，必須把 **API 放到雲端主機**，拿到固定 HTTPS 網址。

| 項目 | 本機通道 | 雲端 API |
|------|----------|----------|
| 電腦可否關機 | 不行 | 可以 |
| 網址會不會變 | 每次重開都變 | 固定 |
| Android APK | 要常改伺服器設定或重建 | 重建**一次**即可 |
| 費用（入門） | 免費 | Render 免費方案可用（見下方限制） |

---

## 一、準備（約 15 分鐘，只需做一次）

### 1. 註冊 Render（免費）

1. 打開 <https://dashboard.render.com/register>
2. 用 **GitHub** 登入，授權讀取 `davidping-happy/sheep`（或你的 fork）

### 2. 用 Blueprint 一鍵部署

1. Render Dashboard → **New** → **Blueprint**
2. 選這個 repo
3. 第一頁這樣填：
   - **Blueprint Name**：`churchsheep`（可自訂，必填）
   - **Branch**：`main`
   - **Blueprint Path**：留空或填 `render.yaml`
4. 下一頁若出現環境變數欄位，請填：
   - `CORS_ORIGINS`：`http://localhost:3001,http://localhost:8081`
   - `SEED_ADMIN_PASSWORD`：你的管理員密碼（至少 12 字）
   - `FIELD_ENCRYPTION_KEY`：本機執行 `openssl rand -hex 32` 產生後貼上
5. 套用後會建立 PostgreSQL `churchsheep-db` 與 Web Service `churchsheep-api`

> 注意：Render **免費方案不支援** `preDeployCommand`，本專案已改成啟動時執行
> `npx prisma migrate deploy && node dist/main.js`。

### 3. 填必要環境變數

在 `churchsheep-api` → **Environment** 設定（Blueprint 已自動產生 JWT／加密金鑰）：

| 變數 | 建議值 |
|------|--------|
| `CORS_ORIGINS` | `http://localhost:3001,http://127.0.0.1:3001,http://localhost:8081,http://127.0.0.1:8081` |
| `SEED_ADMIN_PASSWORD` | 一組至少 12 字、只有你知道的管理員密碼 |
| `FIELD_ENCRYPTION_KEY` | 本機執行 `openssl rand -hex 32` 產生後貼上（64 個 hex 字元） |

部署完成後，服務網址類似：

```
https://churchsheep-api.onrender.com
```

API 路徑是：

```
https://churchsheep-api.onrender.com/api
```

瀏覽器打開測試：

```
https://churchsheep-api.onrender.com/api/health
```

應看到 `{"ok":true,...}`。直播測試：

```
https://churchsheep-api.onrender.com/api/livestream/latest
```

有 JSON（或 `null`）就代表活著。第一次若等很久，是免費方案「休眠喚醒」（約 30～60 秒），屬正常。

### 4. 寫入種子資料（管理員＋示範內容）

在 Render 的 Web Service → **Shell**（若 Free 方案沒有 Shell，改用本機連線雲端資料庫）：

```bash
cd apps/api   # 若 Shell 開在 repo 根目錄
SEED_ADMIN_PASSWORD='你的管理員密碼' npx ts-node prisma/seed.ts
```

或在本機（把 `DATABASE_URL` 暫時改成 Render 給的 **External Database URL**）：

```powershell
cd c:\Users\User\Desktop\churchsheep\apps\api
$env:DATABASE_URL = "postgresql://...Render 外部連線字串..."
$env:SEED_ADMIN_PASSWORD = "你的管理員密碼"
npm run seed
```

---

## 二、讓 Android APK 永遠連雲端（推薦）

1. 打開 `apps/mobile/eas.json`，把 `preview.env.EXPO_PUBLIC_API_BASE` 改成：

```json
"EXPO_PUBLIC_API_BASE": "https://churchsheep-api.onrender.com/api"
```

（網址改成你實際的 Render 網址）

2. 打包：

```powershell
cd c:\Users\User\Desktop\churchsheep\apps\mobile
npm run apk
```

3. 把新 APK 傳給測試者。

之後：**你的電腦可以關機**，測試者照樣登入使用（只要 Render 服務還在）。

已安裝舊 APK 的人：到「更多 → 伺服器連線設定」貼上同一個雲端網址即可，不必重裝。

---

## 三、iPhone 怎麼辦？

| 方式 | 要不要電腦開著 |
|------|----------------|
| Android APK + 雲端 API | 不用 |
| iPhone Safari 網頁版 | 仍要開 Expo web，或另外把網頁部署到雲端 |
| iPhone 獨立 App（TestFlight） | 不用（但需 Apple 開發者帳號） |

目前最快讓 iPhone 也不依賴你電腦：之後可把 Expo web `export` 成靜態站部署到 Render Static／Cloudflare Pages，並指到同一個雲端 API。需要時再說一聲即可幫你做。

---

## 四、本機開發（改用 Docker PostgreSQL）

資料庫已從 SQLite 改為 PostgreSQL（與雲端一致）：

```powershell
cd c:\Users\User\Desktop\churchsheep
docker compose up -d

cd apps\api
# .env 使用：
# DATABASE_URL="postgresql://churchsheep:churchsheep@localhost:5432/churchsheep?schema=public"
npx prisma migrate deploy
npm run seed
npm run start:dev
```

需要安裝 [Docker Desktop](https://www.docker.com/products/docker-desktop/)。

若暫時沒裝 Docker，也可把本機 `.env` 的 `DATABASE_URL` 指到 Render／Neon 的外部連線字串開發（注意不要把密碼提交進 Git）。

---

## 五、免費方案限制（先知道）

- **Web Service**：約 15 分鐘沒人用會休眠，下一個請求會慢 30～60 秒醒來  
- **Free Postgres**：有容量／期限限制（Render 文件會更新，部署前請再確認）  
- 教會正式長期使用建議改付費方案或 Neon／Fly 等較穩的組合  

對「給幾位會友試用 App」通常夠用。

---

## 六、完成檢查清單

- [ ] Render Blueprint 部署成功  
- [ ] `/api/livestream/latest` 可從外網打開  
- [ ] 已 seed 管理員  
- [ ] `eas.json` 已改成雲端 API  
- [ ] 新 APK 已發給測試者  
- [ ] 測試者可在你電腦關機時登入  

完成後就**不必再跑** `npm run public:api` 來給人測 APK。
