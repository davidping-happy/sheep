import { SensitiveCategory } from '../../common/enums';

/**
 * 敏感內容偵測（§6.2 特別敏感情境 / 選項二 自動內容過濾）。
 * 這是骨架版關鍵字比對；正式環境建議：
 *  - 外接更完善的敏感詞庫 / NLP 分類服務
 *  - 命中「自傷/自殺/家暴/精神危機」→ 不公開曝光，優先通報牧者/關懷同工
 *
 * 回傳偵測到的分類（NONE 表示未命中）。
 */
const RULES: { category: SensitiveCategory; keywords: string[] }[] = [
  {
    category: SensitiveCategory.SELF_HARM,
    keywords: ['自殺', '輕生', '自傷', '不想活', '結束生命'],
  },
  {
    category: SensitiveCategory.DOMESTIC_VIOLENCE,
    keywords: ['家暴', '被打', '施暴', '虐待'],
  },
  {
    category: SensitiveCategory.MENTAL_HEALTH_CRISIS,
    keywords: ['憂鬱', '崩潰', '恐慌', '想不開'],
  },
  {
    category: SensitiveCategory.INVOLVES_THIRD_PARTY,
    keywords: ['幫他代禱', '為她求', '別人的事', '第三人'],
  },
  {
    category: SensitiveCategory.INVOLVES_MINOR,
    keywords: ['未成年', '小孩姓名', '國小生', '國中生'],
  },
];

export function detectSensitiveCategory(content: string): SensitiveCategory {
  const text = content.toLowerCase();
  for (const rule of RULES) {
    if (rule.keywords.some((k) => text.includes(k.toLowerCase()))) {
      return rule.category;
    }
  }
  return SensitiveCategory.NONE;
}

/** 是否為需優先通報、不應公開曝光的危機類別。 */
export function isCrisisCategory(category: SensitiveCategory): boolean {
  return [
    SensitiveCategory.SELF_HARM,
    SensitiveCategory.DOMESTIC_VIOLENCE,
    SensitiveCategory.MENTAL_HEALTH_CRISIS,
  ].includes(category);
}
