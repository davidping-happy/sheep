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
1. 看到「教會 APP」登入畫面
2. 點「還沒有帳號？註冊」
3. 填：
   - 顯示名稱：例如 `小明`
   - Email：例如 `ming@test.com`
   - 密碼：**至少 10 個字**，例如 `DemoPassw0rd!`
4. 點「註冊」

### 4. 用代禱牆
1. 首頁點 **「禱告代禱牆 ✓」**
2. 在上方輸入框寫代禱內容
3. 選「私人」或「公開（需審核）」
4. 可勾「匿名」
5. 點「發布」
6. 下方列表會出現你的代禱（下拉可重整）

若選「公開」，到後台審核：

http://localhost:3001/prayer

用 `admin@church.local` / `ChangeMe123456` 登入後按「核准」。

---

## 方式 B：用手機真機（Expo Go）

### 1. 手機安裝「Expo Go」
- Android：Google Play 搜尋 Expo Go  
- iPhone：App Store 搜尋 Expo Go  

### 2. 手機與電腦連**同一個 Wi-Fi**

### 3. 啟動
```powershell
cd c:\Users\User\Desktop\churchsheep\apps\mobile
npm start
```

終端機會出現 **QR Code**。

### 4. 掃碼
- Android：用 Expo Go App 掃  
- iPhone：用系統相機掃，再選用 Expo Go 打開  

### 5. 之後步驟同方式 A 的「註冊／登入」與「用代禱牆」

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
