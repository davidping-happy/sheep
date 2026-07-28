import type { NavigatorScreenParams } from '@react-navigation/native';

export type HomeStackParamList = {
  HomeMain: undefined;
  Devotions: undefined;
  Livestream: undefined;
  Articles: undefined;
  ArticleDetail: { slug: string };
  Groups: undefined;
  GroupDetail: { id: string };
  Announcements: undefined;
  Events: undefined;
  Prayer: undefined;
};

/** @deprecated Prefer HomeStackParamList — kept for gradual screen updates */
export type RootStackParamList = HomeStackParamList;

export type MainTabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList> | undefined;
  FavoritesTab: undefined;
  ProfileTab: undefined;
  MoreTab: undefined;
};
