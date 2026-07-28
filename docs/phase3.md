# 第三階段使用說明

對應系統設計文件第六章「第三階段」：禱告代禱牆（私人／小組＋審核；公開與匿名）、動態 QR Code 簽到。

## 功能清單

| 功能 | 行動端 | 管理後台 | API |
|---|---|---|---|
| 代禱牆私人／小組／公開 | ✓ 發布、feed、代禱、檢舉、下架 | ✓ 審核佇列、危機標記 | ✓ `/prayer/*` |
| 公開前審核 | 公開＝PENDING 提示 | ✓ 核准／退回 | ✓ |
| 匿名發布＋稽核揭示 | ✓ 匿名開關 | ✓ ADMIN 揭示身份 | ✓ 加密對應表 |
| 危機內容 | 自動標記、不公開 | AUTO_FLAGGED＋稽核通報 | ✓ |
| 動態 QR 簽到 | ✓ 輸入／貼上 payload | ✓ QR 圖＋30 秒自動輪替 | ✓ token／checkin |
| 出席名單 | — | ✓ 簽到狀態＋CSV | ✓ roster 含 checkin |

## 啟動

同階段一／二。帳號：`admin@church.local`（密碼以 `npm run set-password` 設定）

```powershell
cd apps\api
npm run seed   # 含示範活動與私人代禱
npm run build
node dist\main.js
```

## 現場簽到流程

1. 後台 `/events` → 查看名單 →「開始現場動態 QR」
2. 會友先報名（須為「已報名」）→「現場簽到」→ 掃 QR 或貼上簽到碼／payload
3. 名單「簽到」欄即時顯示已簽到（重新整理名單）

## 驗證腳本

```powershell
cd apps\api
node demo\demo-phase3.mjs
# 或
npm run demo:phase3
```

## 刻意未納入本階段

- 真實相機掃碼套件（Expo Camera；Web 以貼上／輸入為主）
- 真實 FCM／關懷推播（危機已寫稽核 stub）
- 奉獻金流（階段四）
