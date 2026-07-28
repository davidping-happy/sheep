# 第二階段使用說明

對應系統設計文件第六章「第二階段」：晨禱筆記、後台 CMS、分眾推播、活動報名（名單匯出）。

## 功能清單

| 功能 | 行動端 | 管理後台 | API |
|---|---|---|---|
| 晨禱靈修筆記 | ✓ CRUD、加密同步、預設私人 | — | ✓ `/devotions`、`/devotions/shared` |
| 靈修佳文 CMS | ✓ 公開列表／內容 | ✓ 草稿／編輯／預覽／發布下架 | ✓ `/articles/manage/:id` |
| 分眾推播 | ✓ 已發布公告列表 | ✓ 全教會／牧區／小組／角色＋預估人數 | ✓ `preview-audience`、FCM stub |
| 活動報名 | ✓ 報名／取消／簽到碼 | ✓ 名單、簽到碼、**CSV 匯出** | ✓ `/events/mine` 等 |

## 啟動（同階段一）

```powershell
cd apps\api
npm run build
node dist\main.js

# 另開終端
cd apps\admin-web
npm run dev
# http://localhost:3001

cd apps\mobile
npx expo start --web
# http://localhost:8081
```

帳號：`admin@church.local`（密碼以 `npm run set-password` 設定）

## 後台重點路徑

- `/articles` — 草稿、編輯、預覽、發布／下架
- `/announcements` — 分眾對象、預估收件人數、發布推播
- `/events` — 建立活動、查看名單、匯出 CSV、動態簽到碼

## 行動端重點

- **晨禱靈修筆記**：內容 AES 加密存庫，預設私人
- **活動報名簽到**：列表、報名／候補、輸入現場簽到碼

## 驗證腳本

```powershell
cd apps\api
node demo\demo-phase2.mjs
```

## 尚未納入本階段

- 真實 Firebase FCM（目前 stub，回傳預估 user／device 數）
- 晨禱每日經文推播提醒（可接 FCM topic／排程）
- 禱告牆公開／匿名進階（見階段三設計）
