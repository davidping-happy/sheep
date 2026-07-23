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
import GroupsScreen from './screens/GroupsScreen';
import AnnouncementsScreen from './screens/AnnouncementsScreen';
import EventsScreen from './screens/EventsScreen';
import PrayerScreen from './screens/PrayerScreen';

export type RootStackParamList = {
  Home: undefined;
  Devotions: undefined;
  Livestream: undefined;
  Articles: undefined;
  Groups: undefined;
  Announcements: undefined;
  Events: undefined;
  Prayer: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function MainNavigator() {
  const { signOut } = useAuth();
  return (
    <Stack.Navigator initialRouteName="Home">
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: '教會 APP',
          headerRight: () => (
            <Pressable onPress={() => signOut()} style={{ paddingHorizontal: 8 }}>
              <Text style={{ color: '#4f46e5', fontSize: 15 }}>登出</Text>
            </Pressable>
          ),
        }}
      />
      <Stack.Screen name="Devotions" component={DevotionsScreen} options={{ title: '晨禱靈修筆記' }} />
      <Stack.Screen name="Livestream" component={LivestreamScreen} options={{ title: '主日崇拜' }} />
      <Stack.Screen name="Articles" component={ArticlesScreen} options={{ title: '靈修佳文' }} />
      <Stack.Screen name="Groups" component={GroupsScreen} options={{ title: '牧區・小組' }} />
      <Stack.Screen name="Announcements" component={AnnouncementsScreen} options={{ title: '最新資訊' }} />
      <Stack.Screen name="Events" component={EventsScreen} options={{ title: '活動報名簽到' }} />
      <Stack.Screen name="Prayer" component={PrayerScreen} options={{ title: '禱告代禱牆' }} />
    </Stack.Navigator>
  );
}

function Root() {
  const { ready, signedIn } = useAuth();
  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
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
        <StatusBar style="auto" />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
