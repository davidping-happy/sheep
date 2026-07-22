/** 內容可見範圍（晨禱筆記、代禱牆共用）。預設一律為 PRIVATE。 */
export enum Visibility {
  PRIVATE = 'PRIVATE',
  GROUP = 'GROUP',
  PUBLIC = 'PUBLIC',
}

/** 審核狀態（代禱牆、需審核的 UGC 使用）*/
export enum ModerationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  /** 系統自動過濾攔截，待人工複核 */
  AUTO_FLAGGED = 'AUTO_FLAGGED',
}

/** 活動報名狀態（§6.1）*/
export enum RegistrationStatus {
  REGISTERED = 'REGISTERED',
  WAITLISTED = 'WAITLISTED',
  CANCELLED = 'CANCELLED',
}

/** 簽到方式（§6.1）*/
export enum CheckinMethod {
  /** App 產生動態 QR Code（短效期 Token）*/
  DYNAMIC_QR = 'DYNAMIC_QR',
  /** 同工掃會員條碼 */
  MEMBER_BARCODE = 'MEMBER_BARCODE',
  /** 後台人工補登 */
  MANUAL = 'MANUAL',
}

/** 靈修佳文分類（§二.3，可由後台擴充）*/
export enum ArticleCategory {
  DAILY_BREAD = 'DAILY_BREAD',
  PASTOR_COLUMN = 'PASTOR_COLUMN',
  TESTIMONY = 'TESTIMONY',
  OTHER = 'OTHER',
}

/** 推播分眾目標類型（§二.5 分眾發送）*/
export enum PushAudience {
  ALL = 'ALL',
  PASTORAL_AREA = 'PASTORAL_AREA',
  GROUP = 'GROUP',
  ROLE = 'ROLE',
}

/** 代禱牆敏感情境分類（§6.2 特別敏感情境）*/
export enum SensitiveCategory {
  NONE = 'NONE',
  SELF_HARM = 'SELF_HARM',
  DOMESTIC_VIOLENCE = 'DOMESTIC_VIOLENCE',
  MENTAL_HEALTH_CRISIS = 'MENTAL_HEALTH_CRISIS',
  INVOLVES_THIRD_PARTY = 'INVOLVES_THIRD_PARTY',
  INVOLVES_MINOR = 'INVOLVES_MINOR',
}
