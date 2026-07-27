/**
 * 成二牧區 App — 溫馨家庭風設計 tokens
 */
export const theme = {
  color: {
    bg: '#FBF6F0',
    bgElevated: '#FFFFFF',
    ink: '#3D2C29',
    inkMuted: '#8A6E66',
    border: '#EADFD6',
    brand: '#C46B4A',
    brandSoft: '#F6E6DE',
    brandInk: '#FFFFFF',
    secondary: '#6B8F71',
    secondarySoft: '#E5EFE7',
    danger: '#B42318',
    warn: '#B54708',
    success: '#3F7A52',
    successSoft: '#E8F5EC',
    warnSoft: '#FEF0C7',
  },
  radius: {
    sm: 8,
    md: 14,
    pill: 999,
  },
  space: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
  },
  tapMin: 48,
  brandName: '成二牧區',
  tagline: '我們的屬靈家庭',
} as const;

/** 共用列表卡片／主按鈕樣式片段 */
export const ui = {
  screen: {
    flex: 1,
    backgroundColor: theme.color.bg,
  },
  card: {
    backgroundColor: theme.color.bgElevated,
    borderRadius: theme.radius.md,
    padding: theme.space.md,
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  primaryBtn: {
    backgroundColor: theme.color.brand,
    borderRadius: theme.radius.sm,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: theme.tapMin,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  primaryBtnText: {
    color: theme.color.brandInk,
    fontWeight: '600' as const,
    fontSize: 16,
  },
  ghostBtn: {
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.sm,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: theme.tapMin,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: theme.color.bgElevated,
  },
};
