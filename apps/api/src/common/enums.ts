/**
 * API 端列舉（與 packages/shared 對齊）。
 * 資料庫以字串欄位儲存這些值，驗證由 class-validator + 本檔負責，
 * 使資料模型與 DB 廠商無關（見 prisma/schema.prisma 註解）。
 */

export enum Role {
  MEMBER = 'MEMBER',
  GROUP_LEADER = 'GROUP_LEADER',
  STAFF = 'STAFF',
  ADMIN = 'ADMIN',
}

export const ROLE_RANK: Record<Role, number> = {
  [Role.MEMBER]: 0,
  [Role.GROUP_LEADER]: 1,
  [Role.STAFF]: 2,
  [Role.ADMIN]: 3,
};

export enum Visibility {
  PRIVATE = 'PRIVATE',
  GROUP = 'GROUP',
  PUBLIC = 'PUBLIC',
}

export enum ModerationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  AUTO_FLAGGED = 'AUTO_FLAGGED',
}

export enum RegistrationStatus {
  REGISTERED = 'REGISTERED',
  WAITLISTED = 'WAITLISTED',
  /** 會友申請取消，待管理員審核 */
  CANCEL_PENDING = 'CANCEL_PENDING',
  CANCELLED = 'CANCELLED',
}

export enum CheckinMethod {
  DYNAMIC_QR = 'DYNAMIC_QR',
  MEMBER_BARCODE = 'MEMBER_BARCODE',
  MANUAL = 'MANUAL',
}

export enum ArticleCategory {
  DAILY_BREAD = 'DAILY_BREAD',
  PASTOR_COLUMN = 'PASTOR_COLUMN',
  TESTIMONY = 'TESTIMONY',
  OTHER = 'OTHER',
}

/** 靈修隨記分類 */
export enum DevotionCategory {
  SERMON = 'SERMON',
  MORNING_PRAYER = 'MORNING_PRAYER',
  DEVOTION = 'DEVOTION',
}

export enum PushAudience {
  ALL = 'ALL',
  PASTORAL_AREA = 'PASTORAL_AREA',
  GROUP = 'GROUP',
  ROLE = 'ROLE',
}

export enum SensitiveCategory {
  NONE = 'NONE',
  SELF_HARM = 'SELF_HARM',
  DOMESTIC_VIOLENCE = 'DOMESTIC_VIOLENCE',
  MENTAL_HEALTH_CRISIS = 'MENTAL_HEALTH_CRISIS',
  INVOLVES_THIRD_PARTY = 'INVOLVES_THIRD_PARTY',
  INVOLVES_MINOR = 'INVOLVES_MINOR',
}
