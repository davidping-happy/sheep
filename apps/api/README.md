# 教會 APP — 後端 API (NestJS)

核心服務層。模組化單體，日後可依流量拆微服務（系統設計文件 §三.3）。

## 執行

```bash
cp .env.example .env      # 填 DATABASE_URL、JWT 密鑰、FIELD_ENCRYPTION_KEY 等
npm install               # 於 monorepo root 執行 npm install 亦可
npm run prisma:generate
npm run prisma:migrate    # 建表
npm run seed              # 建立初始管理員與範例牧區（選用）
npm run start:dev         # http://localhost:3000/api  (Swagger: /docs)
```

產生欄位加密金鑰：`openssl rand -hex 32` → 填入 `FIELD_ENCRYPTION_KEY`。

## 端點總覽

| 模組 | 方法 端點 | 最低角色 | 備註 |
|---|---|---|---|
| auth | `POST /auth/register` `login` `refresh` `logout` | 公開 | 短效 JWT + refresh，可撤銷 |
| devotions | `GET/POST /devotions`、`GET/PATCH/DELETE /devotions/:id` | 會友 | 內容 AES-256 加密、僅本人 |
| articles | `GET /articles`、`GET /articles/:slug` | 公開 | 讀取 |
| articles | `POST /articles`、`PATCH /articles/:id` | STAFF | CMS 上稿 |
| livestream | `GET /livestream/latest` | 公開 | YouTube 最新影片（快取）|
| groups | `GET /groups/areas`、`GET /groups/:id` | 公開 | 目錄 |
| groups | `POST /groups` | STAFF；`PATCH /groups/:id` | GROUP_LEADER | 小組長限自己小組 |
| events | `GET /events`、`POST /events/:id/register`、`/cancel`、`/checkin` | 會友 | 報名/簽到 |
| events | `POST /events`、`/:id/checkin-token`、`GET /:id/roster` | STAFF | 名單限主辦同工＋稽核 |
| prayer | `POST /prayer`、`GET /prayer/feed`、`/:id/respond`、`/report`、`/takedown` | 會友 | 預設私人 |
| prayer | `GET /prayer/moderation/queue`、`POST /:id/moderate` | STAFF | 審核 |
| prayer | `POST /prayer/:id/reveal` | ADMIN | 匿名身份稽核（必留紀錄）|
| announcements | `GET /announcements` | 公開；`POST`、`/:id/publish` | STAFF | 分眾推播 |

## 資安對照（§四）

| 需求 | 實作位置 |
|---|---|
| 敏感欄位加密 (STORAGE) | `common/crypto/field-encryption.service.ts`（AES-256-GCM）|
| 密碼雜湊 (CRYPTO) | `auth.service.ts` argon2 |
| 短效 token + refresh + 撤銷 (AUTH) | `auth.service.ts` / `RefreshToken` |
| 速率限制 (NETWORK) | `app.module.ts` ThrottlerGuard |
| 安全標頭 / CORS 白名單 (PLATFORM) | `main.ts` helmet + enableCors |
| RBAC 最小權限 | `auth/guards/roles.guard.ts` + 各 service 所有權檢查 |
| 稽核紀錄 | `common/audit/audit.service.ts` → `AuditLog` |
| 蒐集最小化 | 全域 `ValidationPipe({ whitelist, forbidNonWhitelisted })` |
| 代禱牆危機通報 | `modules/prayer/sensitive-content.util.ts` + `escalated` |

## 待補（TODO，正式上線）

- OAuth2/OIDC Provider 對接、後台 2FA 驗證流程
- YouTube Data API、FCM (firebase-admin)、物件儲存實際串接
- 代禱牆自動封存排程（`archiveAt`）、更完善敏感詞庫/NLP
- 單元/整合測試、CI 納入 MobSF 與 dependency scanning
