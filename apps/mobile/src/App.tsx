import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './auth/AuthContext';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
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

export type RootStackParamList = {
  Home: undefined;
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

const Stack = createNativeStackNavigator<RootStackParamList>();

const headerOpts = {
  headerStyle: { backgroundColor: theme.color.bg },
  headerTintColor: theme.color.brand,
  headerTitleStyle: { color: theme.color.ink, fontWeight: '600' as const },
  contentStyle: { backgroundColor: theme.color.bg },
};

function MainNavigator() {
  const { signOut } = useAuth();
  return (
    <Stack.Navigator initialRouteName="Home" screenOptions={headerOpts}>
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: theme.brandName,
          headerRight: () => (
            <Pressable
              onPress={() => signOut()}
              style={{
                paddingHorizontal: 8,
                minHeight: 44,
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: theme.color.brand, fontSize: 15 }}>登出</Text>
            </Pressable>
          ),
        }}
      />
      <Stack.Screen
        name="Livestream"
        component={LivestreamScreen}
        options={{ title: '主日崇拜' }}
      />
      <Stack.Screen
        name="Articles"
        component={ArticlesScreen}
        options={{ title: '靈修佳文' }}
      />
      <Stack.Screen
        name="ArticleDetail"
        component={ArticleDetailScreen}
        options={{ title: '文章' }}
      />
      <Stack.Screen
        name="Groups"
        component={GroupsScreen}
        options={{ title: '牧區・小組' }}
      />
      <Stack.Screen
        name="GroupDetail"
        component={GroupDetailScreen}
        options={{ title: '小組介紹' }}
      />
      <Stack.Screen
        name="Announcements"
        component={AnnouncementsScreen}
        options={{ title: '最新資訊' }}
      />
      <Stack.Screen
        name="Prayer"
        component={PrayerScreen}
        options={{ title: '禱告代禱牆' }}
      />
      <Stack.Screen
        name="Events"
        component={EventsScreen}
        options={{ title: '活動報名簽到' }}
      />
      <Stack.Screen
        name="Devotions"
        component={DevotionsScreen}
        options={{ title: '晨禱靈修筆記' }}
      />
    </Stack.Navigator>
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
  return <MainNavigator />;
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
