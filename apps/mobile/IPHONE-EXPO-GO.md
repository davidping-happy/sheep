# iPhone 測試（Expo Go，免 Apple Developer）

不做 TestFlight／不繳年費時，iPhone 請用這個方式。

## 建議流程（給測試者）

1. App Store 安裝 **Expo Go**（需支援 **SDK 54**；若打不開專案，先更新 Expo Go）
2. 用 **Safari** 打開下方連結（不要用 LINE 內建瀏覽器）
3. 點 **Open with Expo Go**
4. 看到「成二牧區」或「社青牧區」登入畫面後，註冊（密碼至少 10 字）即可測

> 第一次開啟若很慢：雲端 API 在喚醒（約 30～60 秒），多等一下。

---

## 成二牧區

https://expo.dev/accounts/davidping/projects/churchsheep/updates/f94c0c16-53b7-4ea0-933e-7e82320f30ea

專案頁：https://expo.dev/accounts/davidping/projects/churchsheep

---

## 社青牧區

https://expo.dev/accounts/davidping/projects/youngadult/updates/b8fff188-d2b8-44ae-9bdb-4565dc4b3fff

專案頁：https://expo.dev/accounts/davidping/projects/youngadult

---

## 短訊範本

```
【牧區 App iPhone 測試】
1. App Store 安裝「Expo Go」並更新到最新
2. 用 Safari 打開連結，點 Open with Expo Go

成二：
https://expo.dev/accounts/davidping/projects/churchsheep/updates/f94c0c16-53b7-4ea0-933e-7e82320f30ea

社青：
https://expo.dev/accounts/davidping/projects/youngadult/updates/b8fff188-d2b8-44ae-9bdb-4565dc4b3fff

註冊密碼至少 10 字。第一次可能等 30～60 秒。
```

---

## 注意

| 項目 | 說明 |
|------|------|
| 必須裝 Expo Go | iPhone 無法像 Android 那樣直接裝 APK |
| LINE | 請「用 Safari 開啟」連結，內建瀏覽器常打不開 |
| 與正式 App 差異 | 圖示會是 Expo Go，不是獨立桌面圖示 |
| 之後若要免 Expo | 再考慮 Apple Developer + TestFlight（年費） |

Android 仍用 GitHub APK 直連（不必 Expo），見 [TEST-LINKS.md](./TEST-LINKS.md)。
