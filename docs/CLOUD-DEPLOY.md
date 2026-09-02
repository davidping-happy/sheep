# 24 小時對外測試：API + 管理後台雲端部署

本機 `localhost` 與通道在電腦關機／休眠後會失效。把 **API** 與 **管理後台** 放到 Render 後，關機仍可使用。

| 項目 | 本機 | 雲端（Render） |
|------|------|----------------|
| 電腦可否關機 | 不行 | 可以 |
| 會友 App | 需通道 | 連固定 API |
| 同工後台 | http://localhost:3001 | https://churchsheep-admin.onrender.com |
| 費用（入門） | 免費 | Render 免費方案 |

---

## 一、已有 Blueprint（你目前的狀況）

設定已推上 GitHub（含 `churchsheep-admin`）。請：

1. 打開 Render → **Blueprints** → **churchsheep**
2. 按 **Manual Sync**（或 Update）套用最新 `render.yaml`
3. 確認會新增／部署 Web Service：**churchsheep-admin**
4. 到 **churchsheep-api** → Environment，把 `CORS_ORIGINS` 設成（或確認含後台網址）：

```
http://localhost:3001,http://127.0.0.1:3001,http://localhost:8081,http://127.0.0.1:8081,https://churchsheep-admin.onrender.com
```

5. API 與後台都變成 **Live** 後，用瀏覽器打開：

```
https://churchsheep-admin.onrender.com
https://churchsheep-admin.onrender.com/prayer
```

登入：`admin@church.local` ／ Render 上的 `SEED_ADMIN_PASSWORD`  
（若尚無管理員，API 重啟時會依該密碼自動建立。）

> 實際網址以服務頁上方為準。第一次開啟可能要等 30～60 秒（免費方案休眠喚醒）。

---

## 二、全新 Blueprint（第一次部署時）

1. <https://dashboard.render.com> → **New** → **Blueprint**
2. 選 repo、`main`、`render.yaml`
3. 填 `SEED_ADMIN_PASSWORD`、`FIELD_ENCRYPTION_KEY`
4. Deploy 後會建立：`churchsheep-db`、`churchsheep-api`、`churchsheep-admin`

---

## 三、常用連結

| 用途 | 網址 |
|------|------|
| API 健康檢查 | https://churchsheep-api.onrender.com/api/health |
| 雲端後台 | https://churchsheep-admin.onrender.com |
| 代禱審核 | https://churchsheep-admin.onrender.com/prayer |
| Android APK | 見 Expo Builds／HOW-TO-USE |

---

## 四、免費方案限制

約 15 分鐘無人使用會休眠，下一個請求較慢。長期正式使用可再升級付費方案。

---

## 六、登入出現「資料庫暫時無法連線」

先開健康檢查：

```
https://churchsheep-api.onrender.com/api/health
```

若回傳 `"db":"down"`，請依序檢查：

1. Render Dashboard → 找到 **churchsheep-db**（PostgreSQL）
   - 若服務不存在／已刪除／狀態不是 Available：按下面「重建資料庫」
2. 打開 **churchsheep-db** → **Info**／**Connections**
   - 複製 **Internal Database URL**（同一區的 API 請用 Internal，不要用 External）
3. 打開 **churchsheep-api** → **Environment**
   - 變數 `DATABASE_URL` 貼上剛複製的 URL  
   - 存檔後 **Manual Deploy**（或 Restart）
4. 再開健康檢查，應變成 `"db":"up"`，然後才能登入 App

### 重建資料庫（DB 不見或已過期時）

Render 免費 Postgres 有時會被刪／無法連線。可二選一：

**A. Render 新建 Postgres**

1. **New** → **PostgreSQL** → 名稱例如 `churchsheep-db` → Create  
2. 複製 Internal Database URL → 貼到 `churchsheep-api` 的 `DATABASE_URL`  
3. Restart／Deploy API（啟動後會自動建表／補表）  
4. 用 App **重新註冊**帳號（舊資料在舊 DB，無法自動搬）  
   或設定 `SEED_ADMIN_PASSWORD` 後重啟，再用 `admin@church.local` 登後台

**B. 改用 Neon 免費 Postgres（與社青相同做法，較穩）**

1. 到 <https://neon.tech> 建立專案，複製連線字串（含 `sslmode=require`）  
2. 貼到 Render `churchsheep-api` 的 `DATABASE_URL`  
3. Restart API → 確認 health 為 `"db":"up"` → App 重新註冊

---

## 四之一、忘記密碼／帳號通知（Email＋簡訊）

App 登入改為「帳號＋密碼（至少 6 字元）」；忘記時會同時嘗試寄 **Email** 與 **簡訊**。

在 **churchsheep-api** Environment 設定：

| 變數 | 說明 |
|------|------|
| `RESEND_API_KEY` | [Resend](https://resend.com) API Key（寄信） |
| `MAIL_FROM` | 寄件者，例：`成二牧區 <onboarding@resend.dev>` |
| `TWILIO_ACCOUNT_SID` | [Twilio](https://www.twilio.com) Account SID（簡訊） |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token |
| `TWILIO_FROM` | Twilio 簡訊號碼，例：`+1681……` |
| `BRAND_NAME` | 選填，信／簡訊上顯示名稱 |

未設定時驗證碼仍會產生並寫入 Render Logs；畫面會提示聯絡同工。註冊時需填手機，舊帳號若無手機請請同工補資料或重新註冊。

---

## 五、檢查清單

- [ ] `churchsheep-api` Live
- [ ] `churchsheep-admin` Live
- [ ] 能登入代禱審核
- [ ] 電腦關機後，雲端後台與 App 仍可用
