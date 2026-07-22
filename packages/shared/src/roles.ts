/**
 * RBAC 角色定義（系統設計文件 §三.2 / §四.9）
 * 至少四級，採「最小權限原則」。
 */
export enum Role {
  /** 一般會友：使用 App 各功能，只能存取自己的個人資料 */
  MEMBER = 'MEMBER',
  /** 小組長：僅能編輯「自己所屬小組」的資料與組員，不能看其他牧區會友清單 */
  GROUP_LEADER = 'GROUP_LEADER',
  /** 牧區同工：CMS 上稿、活動主辦、審核、發推播 */
  STAFF = 'STAFF',
  /** 系統管理員：全站管理、稽核紀錄、帳號與角色管理 */
  ADMIN = 'ADMIN',
}

/** 角色高低排序，用於階層式權限判斷（數字越大權限越高） */
export const ROLE_RANK: Record<Role, number> = {
  [Role.MEMBER]: 0,
  [Role.GROUP_LEADER]: 1,
  [Role.STAFF]: 2,
  [Role.ADMIN]: 3,
};

/**
 * 專責角色（非階層，額外指派）。
 * 例如代禱牆管理同工，建議與系統管理員分離，由懂牧養/關懷的人把關。
 */
export enum SpecialAssignment {
  /** 代禱牆管理同工（§6.2 延伸建議）*/
  PRAYER_WALL_MODERATOR = 'PRAYER_WALL_MODERATOR',
  /** 關懷/牧者：接收敏感代禱事項通報 */
  PASTORAL_CARE = 'PASTORAL_CARE',
}

export function hasAtLeast(role: Role, required: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[required];
}
