# iPhone TestFlight（免 Expo Go）

iPhone **不能裝 APK**。要像正式 App 一樣下載測試，流程是：

**Apple Developer（年費）→ EAS 建 iOS → 上傳 App Store Connect → TestFlight 邀請測試者**

本文件適用：
- 成二牧區：`org.church.churchsheep`
- 社青牧區：`org.church.youngadult`

---

## 一、你必須先具備（只能你本人完成）

1. 加入 [Apple Developer Program](https://developer.apple.com/programs/)（約年費 USD 99）
2. 用同一個 Apple ID 登入 [App Store Connect](https://appstoreconnect.apple.com)
3. 在 App Store Connect → **我的 App** → **+** 新增 App（兩個牧區各建一個）：

| App | 名稱 | Bundle ID |
|-----|------|-----------|
| 成二 | 成二牧區 | `org.church.churchsheep` |
| 社青 | 社青牧區 | `org.church.youngadult` |

若 Bundle ID 清單沒有，到 [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list) → Identifiers → **+** → App IDs → 建立上述兩個 ID。

4. 記下每個 App 的 **Apple ID 數字**（App Store Connect → App 資訊 → Apple ID，一串數字），稍後填進 `eas.json` 的 `submit.production.ios.ascAppId`。

---

## 二、在本機登入 Apple（給 EAS 用）

在 PowerShell：

```powershell
# 成二
cd c:\Users\User\Desktop\churchsheep\apps\mobile
npx eas login
npx eas credentials -p ios
```

依畫面選擇 **Set up credentials for building**／讓 Expo 代管憑證（建議選 **Let Expo handle it**）。

需要時輸入：
- Apple ID
- App 專用密碼（若開了雙重認證：https://appleid.apple.com → 登入與安全性 → App 專用密碼）

社青再對 `c:\Users\User\Desktop\youngadult\apps\mobile` 做一次同樣步驟。

---

## 三、建 iOS 並上傳 TestFlight

### 成二牧區

```powershell
cd c:\Users\User\Desktop\churchsheep\apps\mobile
npm run ios:build
# 建置完成後（約 20～40 分）
npm run ios:submit
```

### 社青牧區

```powershell
cd c:\Users\User\Desktop\youngadult\apps\mobile
npm run ios:build
npm run ios:submit
```

或建置時一次送出：

```powershell
npx eas build --platform ios --profile production --auto-submit
```

---

## 四、邀請測試者

1. App Store Connect → 該 App → **TestFlight**
2. 等「缺少出口合規資訊」等提示處理完（通常選「App 不使用加密／僅用 HTTPS」即可）
3. **內部測試**（同一開發團隊）或 **外部測試**（需簡單審核）
4. 加入測試者 **Apple ID 信箱** → 對方 iPhone 安裝 **TestFlight** → 收到邀請信／通知 → 安裝 App

測試者連結會類似：

```
https://testflight.apple.com/join/xxxxxxxx
```

此連結**不必 Expo**，用 TestFlight App 開啟即可。

---

## 五、常見問題

| 狀況 | 處理 |
|------|------|
| 沒有付費 Developer | 無法上 TestFlight，只能繼續用 Expo Go |
| Bundle ID 已被占用 | 改 `app.json` 的 `ios.bundleIdentifier`（兩邊都要改） |
| 雙重認證卡關 | 使用 App 專用密碼，不要用一般登入密碼 |
| 出口合規卡住 | TestFlight → 建置 → 回答加密相關問題 |
| 想更新一版 | `ios.buildNumber` +1 後再 `npm run ios:build` |

---

## 六、跟我說這些，我可以代跑建置指令

請回覆（可遮部分）：

1. Apple Developer 是否已付費開通？是／否  
2. 要先上：**成二**／**社青**／**兩邊**  
3. App Store Connect 裡兩個 App 是否已建立？是／否  
4. （若已建立）ascAppId 數字（可選）  

有憑證後我就能幫你執行 `ios:build`／`ios:submit`。
