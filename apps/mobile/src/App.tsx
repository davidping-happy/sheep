import { ActivityIndicator, Platform, View } from 'react-native';
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
import ProfileScreen from './screens/ProfileScreen';
import DevotionsScreen from './screens/DevotionsScreen';
import LivestreamScreen from './screens/LivestreamScreen';
import ArticlesScreen from './screens/ArticlesScreen';
import ArticleDetailScreen from './screens/ArticleDetailScreen';
import GroupsScreen from './screens/GroupsScreen';
import GroupDetailScreen from './screens/GroupDetailScreen';
import AnnouncementsScreen from './screens/AnnouncementsScreen';
import AnnouncementDetailScreen from './screens/AnnouncementDetailScreen';
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
        name="AnnouncementDetail"
        component={AnnouncementDetailScreen}
        options={{ title: '資訊詳情' }}
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
        options={{ title: '靈修隨記' }}
      />
    </HomeStack.Navigator>
  );
}

/**
 * Android edge-to-edge 下系統常回報 insets.bottom=0。
 * 必須把底部 inset 傳進 BottomTabBar（勿設 tabBarSafeAreaInsets.bottom=0，
 * 也勿只在外層 View padding——BottomTabBar 內部用 insets 算高度與 padding）。
 */
function SafeTabBar(props: BottomTabBarProps) {
  const hookInsets = useSafeAreaInsets();
  const bottom = Math.max(
    props.insets.bottom,
    hookInsets.bottom,
    Platform.OS === 'android' ? 64 : 20,
  );
  return (
    <BottomTabBar
      {...props}
      insets={{ ...props.insets, bottom }}
    />
  );
}

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
          borderTopColor: theme.color.border,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
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
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: '個人中心',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
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
