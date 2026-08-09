# iPhone 測試（Safari 網頁版，免 Expo 登入）

> Expo Go 自 2026/5 起**只允許開啟自己帳號的專案**，測試者會被要求登入 Expo 且無法安裝。  
> 改用下方 **Safari 網頁版**：不必裝 Expo Go、不必 Expo 帳號、不必 Apple Developer。

## 建議流程（給測試者）

1. iPhone 用 **Safari** 打開下方連結（不要用 LINE 內建瀏覽器；可「用 Safari 開啟」）
2. 看到牧區登入畫面後，註冊（密碼至少 6 字）即可測
3. （可選）Safari 底部分享 → **加入主畫面**，之後像 App 一樣點開

> 第一次開啟若很慢：雲端 API 在喚醒（約 30～60 秒），多等一下。

---

## 成二牧區

https://churchsheep-admin.onrender.com/app/

---

## 社青牧區

https://youngadult-admin.onrender.com/app/

---

## 短訊範本

```
【牧區 App iPhone 測試】
請用 Safari 打開（勿用 LINE 內建瀏覽器）：

成二：
https://churchsheep-admin.onrender.com/app/

社青：
https://youngadult-admin.onrender.com/app/

註冊密碼至少 6 字。第一次可能等 30～60 秒。
可選：Safari 分享 → 加入主畫面。
```

---

## 注意

| 項目 | 說明 |
|------|------|
| 不必 Expo Go | 用 Safari 開即可 |
| 不必 Expo 帳號 | 不會再出現「Log in to Expo」 |
| LINE | 請「用 Safari 開啟」連結 |
| 與原生 App 差異 | 是網頁版；可「加入主畫面」較像 App |
| Android | 仍建議用 GitHub APK，見 [TEST-LINKS.md](./TEST-LINKS.md) |
| 之後若要正式上架 | 再考慮 Apple Developer + TestFlight（年費） |

本機開發預覽：`cd apps/mobile && npx expo start --web`
