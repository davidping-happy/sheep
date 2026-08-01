import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import {
  BottomTabBar,
  createBottomTabNavigator,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './auth/AuthContext';
import type { HomeStackParamList, MainTabParamList } from './navigation/types';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import FavoritesScreen from './screens/FavoritesScreen';
import ProfileScreen from './screens/ProfileScreen';
import MoreScreen from './screens/MoreScreen';
import DevotionsScreen from './screens/DevotionsScreen';
import LivestreamScreen from './screens/LivestreamScreen';
import ArticlesScreen from './screens/ArticlesScreen';
import ArticleDetailScreen from './screens/ArticleDetailScreen';
import GroupsScreen from './screens/GroupsScreen';
import GroupDetailScreen from './screens/GroupDetailScreen';
import AnnouncementsScreen from './screens/AnnouncementsScreen';
import EventsScreen from './screens/EventsScreen';
import PrayerScreen from './screens/PrayerScreen';
import { theme } from './theme';

export type { HomeStackParamList, RootStackParamList } from './navigation/types';

const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const headerOpts = {
  headerStyle: { backgroundColor: theme.color.bg },
  headerTintColor: theme.color.brand,
  headerTitleStyle: { color: theme.color.ink, fontWeight: '600' as const },
  contentStyle: { backgroundColor: theme.color.bg },
};

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator initialRouteName="HomeMain" screenOptions={headerOpts}>
      <HomeStack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <HomeStack.Screen
        name="Livestream"
        component={LivestreamScreen}
        options={{ title: '主日崇拜' }}
      />
      <HomeStack.Screen
        name="Articles"
        component={ArticlesScreen}
        options={{ title: '靈修佳文' }}
      />
      <HomeStack.Screen
        name="ArticleDetail"
        component={ArticleDetailScreen}
        options={{ title: '文章' }}
      />
      <HomeStack.Screen
        name="Groups"
        component={GroupsScreen}
        options={{ title: '牧區・小組' }}
      />
      <HomeStack.Screen
        name="GroupDetail"
        component={GroupDetailScreen}
        options={{ title: '小組介紹' }}
      />
      <HomeStack.Screen
        name="Announcements"
        component={AnnouncementsScreen}
        options={{ title: '最新資訊' }}
      />
      <HomeStack.Screen
        name="Prayer"
        component={PrayerScreen}
        options={{ title: '禱告代禱牆' }}
      />
      <HomeStack.Screen
        name="Events"
        component={EventsScreen}
        options={{ title: '活動報名簽到' }}
      />
      <HomeStack.Screen
        name="Devotions"
        component={DevotionsScreen}
        options={{ title: '晨禱靈修筆記' }}
      />
    </HomeStack.Navigator>
  );
}

/** 分頁列墊高底部，避開 iPhone Home Indicator／Android 系統導覽鍵 */
function SafeTabBar(props: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  // Expo Go 等環境常回報 insets.bottom=0，Android 仍需避開三鍵／手勢列
  const bottomPad = Math.max(
    insets.bottom,
    Platform.OS === 'android' ? 48 : 20,
  );
  return (
    <View style={[tabBarSafeStyles.wrap, { paddingBottom: bottomPad }]}>
      <BottomTabBar {...props} />
    </View>
  );
}

const tabBarSafeStyles = StyleSheet.create({
  wrap: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.color.border,
  },
});

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <SafeTabBar {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: theme.color.bg },
        headerTintColor: theme.color.brand,
        headerTitleStyle: { color: theme.color.ink, fontWeight: '600' },
        tabBarActiveTintColor: theme.color.brand,
        tabBarInactiveTintColor: theme.color.inkMuted,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          elevation: 0,
          height: 56,
          paddingTop: 4,
          paddingBottom: 4,
        },
        tabBarItemStyle: { paddingVertical: 2 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
        tabBarSafeAreaInsets: { bottom: 0 },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{
          title: '首頁',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="FavoritesTab"
        component={FavoritesScreen}
        options={{
          title: '我的最愛',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: '個人中心',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="MoreTab"
        component={MoreScreen}
        options={{
          title: '更多',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="menu" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function Root() {
  const { ready, signedIn } = useAuth();
  if (!ready) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.color.bg,
        }}
      >
        <ActivityIndicator color={theme.color.brand} />
      </View>
    );
  }
  if (!signedIn) return <LoginScreen />;
  return <MainTabs />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <Root />
        </NavigationContainer>
        <StatusBar style="dark" />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
