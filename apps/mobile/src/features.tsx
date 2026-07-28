import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from './theme';

export type IconFamily = 'ion' | 'mci';

export interface FeatureDef {
  key:
    | 'Livestream'
    | 'Devotions'
    | 'Articles'
    | 'Groups'
    | 'Announcements'
    | 'Events'
    | 'Prayer';
  title: string;
  desc: string;
  icon: string;
  family: IconFamily;
  color: string;
}

export const FEATURES: FeatureDef[] = [
  {
    key: 'Livestream',
    title: '主日崇拜',
    desc: '一起敬拜・直播／回放',
    icon: 'church',
    family: 'mci',
    color: '#C46B4A',
  },
  {
    key: 'Devotions',
    title: '晨禱靈修筆記',
    desc: '每日與主親近',
    icon: 'create-outline',
    family: 'ion',
    color: '#6B8F71',
  },
  {
    key: 'Articles',
    title: '靈修佳文',
    desc: '每日靈糧・牧者專欄',
    icon: 'book-outline',
    family: 'ion',
    color: '#B85C38',
  },
  {
    key: 'Groups',
    title: '牧區・小組',
    desc: '認識我們的小組家庭',
    icon: 'people-outline',
    family: 'ion',
    color: '#5B8A8A',
  },
  {
    key: 'Announcements',
    title: '最新資訊',
    desc: '牧區公告與提醒',
    icon: 'megaphone-outline',
    family: 'ion',
    color: '#C46B4A',
  },
  {
    key: 'Events',
    title: '活動報名簽到',
    desc: '聚會報名・現場簽到',
    icon: 'calendar-outline',
    family: 'ion',
    color: '#8B6B4A',
  },
  {
    key: 'Prayer',
    title: '禱告代禱牆',
    desc: '彼此守望・關懷代禱',
    icon: 'heart-outline',
    family: 'ion',
    color: '#A65D4A',
  },
];

export function FeatureIcon({
  family,
  name,
  color,
  size = 22,
}: {
  family: IconFamily;
  name: string;
  color?: string;
  size?: number;
}) {
  const c = color ?? theme.color.brandInk;
  if (family === 'mci') {
    return (
      <MaterialCommunityIcons name={name as never} size={size} color={c} />
    );
  }
  return <Ionicons name={name as never} size={size} color={c} />;
}
