# 成二牧區 App — 測試下載連結

API：https://churchsheep-api.onrender.com/api  
後台：https://churchsheep-admin.onrender.com  
Expo 專案：https://expo.dev/accounts/davidping/projects/churchsheep

---

## Android（下載 APK 安裝）

**請用這個連結（可傳 LINE；勿用 Expo 直連）：**

https://github.com/davidping-happy/sheep/releases/download/v1.1.0-preview/churchsheep-1.1.0.apk

Release 頁：https://github.com/davidping-happy/sheep/releases/tag/v1.1.0-preview

1. 用 **Chrome** 打開（不要用 LINE 內建瀏覽器）
2. 下載完成後到手機 **檔案／下載**，點 `churchsheep-1.1.0.apk` 安裝
3. 若畫面卡在「下載中…」但已 100%：按取消，改到下載資料夾開啟檔案
4. 允許「未知來源」後安裝 **成二牧區**

---

## iPhone（Expo Go，免付費 Apple 開發者帳號）

1. App Store 安裝 **Expo Go**（需支援 SDK 54）
2. 用 Safari 打開，點 **Open with Expo Go**：

https://expo.dev/accounts/davidping/projects/churchsheep/updates/4562ad33-9935-4b7d-9158-6ae1cd08b0f2

或專案頁：https://expo.dev/accounts/davidping/projects/churchsheep  
→ Updates → `preview` → Open in Expo Go

3. 應看到「成二牧區」登入畫面

> 若要獨立 App／TestFlight（不用 Expo Go），需 Apple Developer 年費。

---

## 給測試者的短訊範本

```
【成二牧區 App 測試】

Android（請用 Chrome 開，不要用 LINE 內建瀏覽器）：
→ https://github.com/davidping-happy/sheep/releases/download/v1.1.0-preview/churchsheep-1.1.0.apk
下載完到「檔案／下載」點 APK 安裝

iPhone：先裝 App Store「Expo Go」，再開
→ https://expo.dev/accounts/davidping/projects/churchsheep/updates/4562ad33-9935-4b7d-9158-6ae1cd08b0f2
   點 Open with Expo Go

註冊密碼至少 10 個字。
第一次較慢是雲端喚醒（約 30～60 秒）。
```

---

## 本機重新發布 Expo Go 更新

```powershell
cd c:\Users\User\Desktop\churchsheep\apps\mobile
npm run update:preview
```
