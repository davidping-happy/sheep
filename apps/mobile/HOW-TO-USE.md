# 行動端：登入＋代禱牆（超簡操作）

兩種方式任選一種。**建議先用方式 A（電腦瀏覽器）**，比較容易。

---

## 方式 A：用電腦瀏覽器試（不用手機）

### 1. 確認 API 有開
電腦瀏覽器打開：

http://localhost:3000/api/livestream/latest

有出現頁面（空白或 `null` 也可以）就代表 API 活著。

### 2. 啟動行動端
在 Cursor 終端機執行：

```powershell
cd c:\Users\User\Desktop\churchsheep\apps\mobile
npm start
```

出現選單後，按鍵盤 **`w`**（web），會自動打開瀏覽器。

或直接：

```powershell
cd c:\Users\User\Desktop\churchsheep\apps\mobile
npx expo start --web
```

### 3. 註冊／登入
1. 看到「成二牧區」登入畫面
2. 點「還沒有帳號？註冊」
3. 填：
   - 顯示名稱：例如 `小明`
   - Email：例如 `ming@test.com`
   - 密碼：**至少 10 個字**，例如 `DemoPassw0rd!`
4. 點「註冊」

### 4. 逛首頁與代禱牆
1. 登入後看到溫馨首頁橫幅＋圓形圖示功能列；底部有 **首頁／我的最愛／個人中心／更多**
2. 首頁點 **「禱告代禱牆」**
3. 在上方輸入框寫代禱內容
4. 選「私人」或「公開（需審核）」
5. 可勾「匿名」
6. 點「發布」
7. 下方列表會出現你的代禱（下拉可重整）

若選「公開」，到後台審核：

http://localhost:3001/prayer

用 `admin@church.local` 登入後按「核准」（密碼為你以 `npm run set-password` 設定的值）。

---

## 方式 B：用手機真機（Expo Go）下載測試

> 這不是安裝正式 APK，而是用 **Expo Go** 即時載入專案（開發測試最常用）。

### 1. 手機安裝 Expo Go
- Android：Google Play 搜尋 **Expo Go**
- iPhone：App Store 搜尋 **Expo Go**

### 2. 手機與電腦連**同一個 Wi-Fi**

### 3. 確認 API 位址（給手機連）
手機不能用 `localhost`，要用電腦的區網 IP。目前 `apps/mobile/app.json`：

```json
"extra": { "apiBase": "http://10.75.32.231:3000/api" }
```

若你家 IP 變了，在 PowerShell 查：

```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -like '10.*' -or $_.IPAddress -like '192.168.*' }
```

把查到的 IP 寫回 `app.json` 的 `apiBase`，並確認 API 有開：

```powershell
cd c:\Users\User\Desktop\churchsheep\apps\api
node dist\main.js
```

手機瀏覽器先試：`http://你的IP:3000/api/livestream/latest`  
打得開才代表手機連得到後端。

### 4. 啟動 Expo
```powershell
cd c:\Users\User\Desktop\churchsheep\apps\mobile
npx expo start
```

終端機會出現 **QR Code**。

### 5. 掃碼進入 App
- **Android**：開 Expo Go → Scan QR code  
- **iPhone**：用系統相機掃 QR → 選用 Expo Go 開啟  

### 6. 登入測試
1. 看到「成二牧區」
2. 註冊一組帳號（密碼至少 10 字）或用既有帳號登入
3. 點「主日崇拜」可看當週最新主日信息

### 連不上時
| 狀況 | 怎麼辦 |
|---|---|
| 掃碼沒反應 | 確認同 Wi-Fi；終端機按 `s` 切換連線模式再掃 |
| 登入 Failed to fetch | `apiBase` IP 錯了，或 Windows 防火牆擋 3000 埠 |
| 一直 Loading | 電腦 API 沒開，或手機連不到該 IP |

> 若要做成可安裝的正式 App（.apk / TestFlight），需另走 EAS Build／上架流程，開發階段用 Expo Go 即可。

---

## 常見問題

| 狀況 | 怎麼辦 |
|---|---|
| 登入出現 Failed to fetch | API 沒開，或 CORS 未含 :8081。確認 `apps/api/.env` 的 `CORS_ORIGINS` 含 `http://localhost:8081`，並重啟 API |
| 密碼太短被拒 | 密碼至少 10 字元 |
| 按 `w` 沒反應 | 改跑 `npx expo start --web` |
| 掃碼連不上 | 確認同 Wi-Fi；或在終端機按 `s` 切換連線模式後再試 |

---

## 一鍵指令摘要

```powershell
# 終端機 1（若 API 還沒開）
cd c:\Users\User\Desktop\churchsheep\apps\api
node dist\main.js

# 終端機 2（行動端）
cd c:\Users\User\Desktop\churchsheep\apps\mobile
npx expo start --web
```
