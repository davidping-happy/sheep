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

## 五、檢查清單

- [ ] `churchsheep-api` Live
- [ ] `churchsheep-admin` Live
- [ ] 能登入代禱審核
- [ ] 電腦關機後，雲端後台與 App 仍可用
