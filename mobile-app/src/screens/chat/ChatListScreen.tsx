import React, { useEffect } from 'react';
import { View, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { chatApi } from '../../api/chat';
import { useAuthStore } from '../../store/useAuthStore';
import { socketService } from '../../services/socketService';
import { useI18n } from '../../i18n/I18nProvider';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
import { colors } from '../../theme/colors';
import { spacing, layout } from '../../theme/spacing';

type Participant = { _id: string; name: string; role: string };
type Conversation = {
  _id: string;
  task?: { title?: string };
  conversationType?: 'task' | 'direct';
  participants?: Participant[];
  lastMessage?: { content?: string };
  unreadCount?: { employer?: number; vendor?: number };
  unreadCountForUser?: number;
};

export default function ChatListScreen() {
  const nav = useNavigation<any>();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const { t } = useI18n();
  const { data = [], isLoading, isError, error, refetch, isRefetching } = useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: () => chatApi.list(),
  });

  useEffect(() => {
    const handler = () => {
      qc.invalidateQueries({ queryKey: ['conversations'] });
    };
    socketService.onReceiveMessage(handler);
    return () => socketService.offReceiveMessage(handler);
  }, [qc]);

  if (isLoading) {
    return <Screen><View style={styles.center}><Text>Loading conversations...</Text></View></Screen>;
  }
  if (isError) {
    return <Screen><View style={styles.center}><Text color={colors.error}>{(error as any)?.message || 'Failed to load conversations.'}</Text></View></Screen>;
  }

  const getOtherName = (participants?: Participant[]) => {
    if (!participants || !user) return 'Conversation';
    const other = participants.find(p => p._id !== user._id);
    return other?.name || 'Conversation';
  };

  const getOtherId = (participants?: Participant[]) => {
    if (!participants || !user) return undefined;
    const other = participants.find(p => p._id !== user._id);
    return other?._id;
  };

  const getUnread = (c: Conversation) => {
    if (!user) return 0;
    if (typeof c.unreadCountForUser === 'number') return c.unreadCountForUser;
    return user.role === 'employer' ? (c.unreadCount?.employer || 0) : (c.unreadCount?.vendor || 0);
  };

  return (
    <Screen>
      <FlatList
        data={data}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.center}><Text color={colors.textSecondary}>{t('chat.empty')}</Text></View>
        }
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        renderItem={({ item }) => {
          const unread = getUnread(item);
          return (
            <TouchableOpacity
              onPress={() => nav.navigate('ChatThread', { id: item._id, otherUserId: getOtherId(item.participants), otherName: getOtherName(item.participants) })}
              activeOpacity={0.8}
            >
              <Card style={styles.card}>
                <View style={styles.rowHeader}>
                  <Text variant="m" weight="bold" style={styles.title}>{getOtherName(item.participants)}</Text>
                  {unread > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text variant="xs" color={colors.textInverted} weight="bold">{unread}</Text>
                    </View>
                  )}
                </View>
                <Text variant="xs" color={colors.textSecondary} style={styles.meta}>
                  {item.task?.title || (item.conversationType === 'direct' ? 'Direct message' : 'Task conversation')}
                </Text>
                <Text variant="s" color={unread > 0 ? colors.text : colors.textSecondary} numberOfLines={1} style={styles.preview} weight={unread > 0 ? 'medium' : 'regular'}>
                  {item.lastMessage?.content || 'No messages yet'}
                </Text>
              </Card>
            </TouchableOpacity>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  listContent: { padding: spacing.m, gap: spacing.s },
  card: { gap: 4 },
  rowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { flex: 1 },
  meta: { marginBottom: 2 },
  preview: { marginTop: 2 },
  unreadBadge: { backgroundColor: colors.error, borderRadius: layout.borderRadius.round, paddingHorizontal: 6, paddingVertical: 2, minWidth: 20, alignItems: 'center' },
});
