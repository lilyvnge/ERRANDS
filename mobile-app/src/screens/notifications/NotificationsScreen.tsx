import React from 'react';
import { FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useNotificationStore } from '../../store/useNotificationStore';
import { notificationApi } from '../../api/notifications';
import { useQuery } from '@tanstack/react-query';
import { useI18n } from '../../i18n/I18nProvider';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

export default function NotificationsScreen() {
  const nav = useNavigation<any>();
  const notifications = useNotificationStore((s) => s.notifications);
  const setNotifications = useNotificationStore((s) => s.setNotifications);
  const { t } = useI18n();
  const { refetch, isRefetching, isError, error } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationApi.list,
    onSuccess: (items) => {
      if (Array.isArray(items)) setNotifications(items);
    }
  });

  const markAsRead = useNotificationStore((s) => s.markAsRead);

  const handlePress = async (item: any) => {
    if (!item.isRead) {
      markAsRead(item._id);
      try {
        await notificationApi.markRead(item._id);
      } catch (e) {
        // ignore
      }
    }

    if (item.actionUrl) {
      const url = String(item.actionUrl);
      const taskMatch = url.match(/\/tasks\/([^/?#]+)/i);
      if (taskMatch?.[1]) {
        nav.navigate('TaskDetails', { id: taskMatch[1] });
        return;
      }
      const chatMatch = url.match(/\/chat\/([^/?#]+)/i);
      if (chatMatch?.[1]) {
        nav.navigate('ChatThread', { id: chatMatch[1] });
        return;
      }
      if (/\/payments/i.test(url)) {
        nav.navigate('MainTabs', { screen: 'Payments' });
        return;
      }
      if (/\/verification/i.test(url)) {
        nav.navigate('VendorVerification');
        return;
      }
      if (/\/profile/i.test(url)) {
        nav.navigate('MainTabs', { screen: 'Profile' });
        return;
      }
    }
    const taskId = item.taskId || (item.relatedEntity === 'task' ? item.relatedEntityId : undefined);
    if (taskId) {
      nav.navigate('TaskDetails', { id: String(taskId) });
      return;
    }
    switch (item.relatedEntity) {
      case 'payment':
        nav.navigate('MainTabs', { screen: 'Payments' });
        break;
      case 'verification':
        nav.navigate('VendorVerification');
        break;
      case 'user':
        nav.navigate('MainTabs', { screen: 'Profile' });
        break;
      default:
        // just stay here or refresh
        break;
    }
  };

  return (
    <Screen>
      <FlatList
        contentContainerStyle={styles.container}
        data={notifications}
        keyExtractor={(n) => n._id}
        ListEmptyComponent={
          <Text variant="s" color={colors.textSecondary} centered style={{ marginTop: spacing.l }}>
            {isError ? ((error as any)?.message || 'Failed to load notifications.') : t('notifications.empty')}
          </Text>
        }
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => handlePress(item)} activeOpacity={0.8}>
            <Card style={styles.card}>
              <Text variant="s" weight="bold" style={{ marginBottom: 2 }}>
                {item.title || item.type || 'Notification'}
              </Text>
              <Text variant="s" color={colors.textSecondary} style={{ marginBottom: 4 }}>
                {item.message || 'Update available'}
              </Text>
              {item.createdAt && (
                <Text variant="xs" color={colors.textLight}>
                  {new Date(item.createdAt).toLocaleString()}
                </Text>
              )}
            </Card>
          </TouchableOpacity>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.m, gap: spacing.s },
  card: { gap: 2 },
});
