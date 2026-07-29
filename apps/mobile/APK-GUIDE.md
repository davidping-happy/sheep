# 打包 Android APK 給別人測試

目標：測試者只要**下載一個檔案、點開安裝**，不必安裝 Expo Go。

- 建置在 Expo 雲端（EAS Build）進行，**你的電腦不用安裝 Android SDK**
- iPhone 不能用 APK；iOS 需要另外走 TestFlight
- 需要一個免費的 Expo 帳號

---

## 一次性準備

### 1. 註冊／登入 Expo 帳號

到 <https://expo.dev/signup> 註冊（免費），然後在終端機執行：

```powershell
cd c:\Users\User\Desktop\churchsheep\apps\mobile
npx eas login
```

輸入 Expo 的帳號密碼。確認狀態：

```powershell
npx eas whoami
```

### 2. 建立 EAS 專案（第一次才需要）

```powershell
npx eas init
```

它會在 `app.json` 自動寫入 `extra.eas.projectId`。

---

## 每次要產出新 APK

### 步驟 1：先讓 API 可以對外連線

測試者不在你家 Wi‑Fi，所以 API 必須有公開網址。開一個**專用視窗**執行：

```powershell
cd c:\Users\User\Desktop\churchsheep
npm run public:api
```

它會啟動 API、開通道、做一次外部連線測試，並**自動把新網址寫進 `eas.json` 的
`preview` 設定**，所以不必手動改檔案。畫面會顯示：

```
公開網址： https://xxxx-xxxx-xxxx.trycloudflare.com/api
外部連線測試通過。
eas.json 的 preview 設定已更新為新網址。
```

**這個視窗要一直開著**，關掉或按 Ctrl+C 測試者就連不上。

### 步驟 2：建置 APK

```powershell
cd c:\Users\User\Desktop\churchsheep\apps\mobile
npm run apk
```

- Android keystore（簽章金鑰）已由 Expo 保管，之後每次建置都用同一把
- 排隊＋建置時間不固定，實測從送出到完成約 2 小時（免費方案排隊佔大部分）
- 完成後終端機會給一個下載連結，也可到 <https://expo.dev> 的專案頁 → Builds 下載

查看進度：

```powershell
npm run apk:status
```

### 步驟 3：發給測試者

把 APK 檔（或 Expo 給的下載連結）用 LINE／Google Drive 傳出去，附上這段說明：

> 1. 點連結下載 APK
> 2. 手機會提醒「不允許安裝未知來源的應用程式」→ 允許這一次
> 3. 安裝後打開「成二牧區」
> 4. 用邀請的帳號登入，或點「還沒有帳號？註冊」（密碼至少 10 個字）

---

## 網址變了怎麼辦（不用重新打包）

Cloudflare 免費通道每次重開網址都會變。**不必重新建置 APK**，請測試者：

1. 打開 App → 底部 **更多**
2. 點 **伺服器連線設定**
3. 貼上新網址（例如 `https://新網址.trycloudflare.com`，可以不打 `/api`，App 會自動補）
4. 按 **儲存並測試連線**，看到「連線成功」即可

---

## 常見問題

| 狀況 | 原因與處理 |
|------|------------|
| 登入顯示 `Network request failed` | 通道視窗關了，或 API 沒開 → 重跑步驟 1 |
| 昨天可以、今天測試者連不上 | 電腦休眠或重開機後通道會停止，**重開後網址也會變**。重跑步驟 1，再把新網址給測試者填（或重新打包一版） |
| 安裝時被阻擋 | Android 需允許「未知來源」安裝 |
| 建置失敗說找不到 projectId | 先執行 `npx eas init` |
| 想給 iPhone 測 | APK 不支援 iOS，需要 Apple 開發者帳號走 TestFlight |

---

## 之後要更穩定的話（推薦）

本機 Cloudflare 通道靠你的電腦開著，**休眠／關機就會斷線**。

要讓測試者 24 小時都連得上：請改走雲端部署（Render + PostgreSQL），
步驟見 [docs/CLOUD-DEPLOY.md](../../docs/CLOUD-DEPLOY.md)。部署後把
`eas.json` 的 `EXPO_PUBLIC_API_BASE` 改成雲端網址，再 `npm run apk` 一次即可。

現在的通道腳本仍適合「臨時給旁邊的人試一下」。
