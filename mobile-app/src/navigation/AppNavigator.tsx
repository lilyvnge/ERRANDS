import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { socketService } from '../services/socketService';
import { notificationApi } from '../api/notifications';
import { useNotificationStore } from '../store/useNotificationStore';
import { useToast } from '../components/Toast/ToastProvider';

// Screens (stub these for now)
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import TaskFeedScreen from '../screens/tasks/TaskFeedScreen';
import TaskDetailsScreen from '../screens/tasks/TaskDetailsScreen';
import CreateTaskScreen from '../screens/tasks/CreateTaskScreen';
import ChatListScreen from '../screens/chat/ChatListScreen';
import ChatThreadScreen from '../screens/chat/ChatThreadScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import PaymentsScreen from '../screens/payments/PaymentsScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import VendorDiscoverScreen from '../screens/vendors/VendorDiscoverScreen';
import VendorProfileScreen from '../screens/vendors/VendorProfileScreen';
import VendorVerificationScreen from '../screens/vendors/VendorVerificationScreen';
import PermissionsScreen from '../screens/settings/PermissionsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

import { useChatStore } from '../store/useChatStore';
import { chatApi } from '../api/chat';

const AppTabs: React.FC<{ role?: string }> = ({ role }) => {
  const notifications = useNotificationStore((s) => s.notifications);
  const notifUnreadCount = notifications.filter(n => !n.isRead).length;
  const notifBadge = notifUnreadCount > 0 ? notifUnreadCount : undefined;

  const chatUnreadCount = useChatStore((s) => s.unreadCount);
  const chatBadge = chatUnreadCount > 0 ? chatUnreadCount : undefined;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'help-outline';

          if (route.name === 'Tasks' || route.name === 'Jobs') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Vendors') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Verification') {
            iconName = focused ? 'shield-checkmark' : 'shield-checkmark-outline';
          } else if (route.name === 'Chat') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Payments') {
            iconName = focused ? 'card' : 'card-outline';
          } else if (route.name === 'Notifications') {
            iconName = focused ? 'notifications' : 'notifications-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        headerShown: false,
      })}
    >
      <Tab.Screen name={role === 'vendor' ? 'Jobs' : 'Tasks'} component={TaskFeedScreen} />
      {role === 'employer' && <Tab.Screen name="Vendors" component={VendorDiscoverScreen} />}
      {role === 'vendor' && <Tab.Screen name="Verification" component={VendorVerificationScreen} />}
      <Tab.Screen 
        name="Chat" 
        component={ChatListScreen} 
        options={{ tabBarBadge: chatBadge }}
      />
      {role !== 'vendor' && <Tab.Screen name="Payments" component={PaymentsScreen} />}
      <Tab.Screen 
        name="Notifications" 
        component={NotificationsScreen} 
        options={{ tabBarBadge: notifBadge }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export default function AppNavigator() {
  const { user, restore, isHydrating } = useAuthStore();
  const setNotifications = useNotificationStore((s) => s.setNotifications);
  const lastCount = useNotificationStore((s) => s.lastCount);
  const setLastCount = useNotificationStore((s) => s.setLastCount);
  const addNotification = useNotificationStore((s) => s.addNotification);
  const setChatUnread = useChatStore((s) => s.setUnreadCount);
  const toast = useToast();

  useEffect(() => {
    restore();
  }, [restore]);

  useEffect(() => {
    if (user?.token) {
      socketService.connect(user.token);
    } else {
      socketService.disconnect();
    }
    return () => socketService.disconnect();
  }, [user?.token]);

  useEffect(() => {
    if (!user?.token) return;
    let timer: any;
    
    const fetchData = async () => {
      // Notifications
      try {
        const items = await notificationApi.list();
        if (Array.isArray(items)) {
          setNotifications(items);
          if (items.length > lastCount && lastCount > 0) {
            // toast.show(items[0]?.title || 'New notification', 'info');
          }
          setLastCount(items.length);
        }
      } catch (err) {
        // silent
      }

      // Chat Unread Count
      try {
        const conversations = await chatApi.list();
        if (Array.isArray(conversations)) {
          let totalUnread = 0;
          conversations.forEach((c: any) => {
             const count = user.role === 'employer' ? (c.unreadCount?.employer || 0) : (c.unreadCount?.vendor || 0);
             totalUnread += count;
          });
          setChatUnread(totalUnread);
        }
      } catch (err) {
        // silent
      }
    };

    fetchData();
    timer = setInterval(fetchData, 15000); // Poll every 15s
    return () => clearInterval(timer);
  }, [user?.token, lastCount, setNotifications, setLastCount, setChatUnread, user?.role]);

  useEffect(() => {
    if (!user?.token) return;
    
    const handleSocketNotification = (payload: any) => {
      addNotification({
        _id: payload?.id || `${Date.now()}`,
        title: payload?.title,
        message: payload?.message,
        type: payload?.type,
        createdAt: payload?.createdAt
      });
      toast.show(payload?.title || 'New notification', payload?.type === 'error' ? 'error' : 'info');
    };

    const handleSocketMessage = () => {
      // Refresh chat count on new message
      chatApi.list().then((conversations) => {
        if (Array.isArray(conversations)) {
          let totalUnread = 0;
          conversations.forEach((c: any) => {
             const count = user.role === 'employer' ? (c.unreadCount?.employer || 0) : (c.unreadCount?.vendor || 0);
             totalUnread += count;
          });
          setChatUnread(totalUnread);
        }
      }).catch(() => {});
    };

    socketService.onNotification(handleSocketNotification);
    socketService.onReceiveMessage(handleSocketMessage);
    
    return () => {
      socketService.offNotification(handleSocketNotification);
      socketService.offReceiveMessage(handleSocketMessage);
    };
  }, [user?.token, addNotification, setChatUnread, user?.role]);

  if (isHydrating) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="MainTabs">
              {() => <AppTabs role={user?.role} />}
            </Stack.Screen>
            <Stack.Screen name="TaskDetails" component={TaskDetailsScreen} />
            <Stack.Screen name="CreateTask" component={CreateTaskScreen} />
            <Stack.Screen name="ChatThread" component={ChatThreadScreen} />
            <Stack.Screen name="VendorProfile" component={VendorProfileScreen} />
            <Stack.Screen name="VendorVerification" component={VendorVerificationScreen} />
            <Stack.Screen name="Permissions" component={PermissionsScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
