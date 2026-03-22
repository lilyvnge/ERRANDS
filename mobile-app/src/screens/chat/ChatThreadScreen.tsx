import React, { useEffect, useRef, useState } from 'react';
import { View, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatApi } from '../../api/chat';
import { socketService } from '../../services/socketService';
import { useAuthStore } from '../../store/useAuthStore';
import { useI18n } from '../../i18n/I18nProvider';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { colors } from '../../theme/colors';
import { spacing, layout } from '../../theme/spacing';

type Message = { _id: string; content: string; sender?: { _id?: string; name?: string }; createdAt?: string };

export default function ChatThreadScreen() {
  const { params } = useRoute<any>();
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [typingUserIds, setTypingUserIds] = useState<Set<string>>(new Set());
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const { user } = useAuthStore();
  const { t } = useI18n();
  const listRef = useRef<FlatList>(null);

  const { data: messages = [], isLoading, isError, error } = useQuery<Message[]>({
    queryKey: ['chat', params?.id],
    queryFn: () => chatApi.getMessages(params?.id)
  });

  const sendMut = useMutation({
    mutationFn: (content: string) => chatApi.sendMessage(params?.id, content),
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ['chat', params?.id] });
      if (user) {
        socketService.sendMessage({
          conversationId: params?.id,
          senderId: user._id,
          content: saved?.content || text
        });
      }
    }
  });

  useEffect(() => {
    if (!params?.id) return;
    socketService.joinConversation(params.id);

    const handleReceive = (data: any) => {
      if (data.conversationId !== params.id) return;
      if (data.senderId === user?._id) return;
      qc.invalidateQueries({ queryKey: ['chat', params?.id] });
    };

    const handleTyping = (data: { userId: string; isTyping: boolean }) => {
      setTypingUserIds((prev) => {
        const next = new Set(prev);
        if (data.isTyping) next.add(data.userId);
        else next.delete(data.userId);
        return next;
      });
    };

    const handleOnline = (data: { userId: string }) => {
      setOnlineUserIds((prev) => new Set(prev).add(data.userId));
    };
    const handleOffline = (data: { userId: string }) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        next.delete(data.userId);
        return next;
      });
    };

    socketService.onReceiveMessage(handleReceive);
    socketService.onUserTyping(handleTyping);
    socketService.onUserOnline(handleOnline);
    socketService.onUserOffline(handleOffline);

    return () => {
      socketService.leaveConversation(params.id);
      socketService.offReceiveMessage(handleReceive);
      socketService.offUserTyping(handleTyping);
      socketService.offUserOnline(handleOnline);
      socketService.offUserOffline(handleOffline);
    };
  }, [params?.id, qc, user?._id]);

  useEffect(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages.length]);

  if (isLoading) return <Screen><View style={styles.center}><Text>Loading messages...</Text></View></Screen>;
  if (isError) return <Screen><View style={styles.center}><Text color={colors.error}>{(error as any)?.message || 'Failed to load messages.'}</Text></View></Screen>;

  return (
    <Screen safeArea={false} style={{ flex: 1 }}>
      <View style={styles.header}>
        <Text variant="m" weight="bold">{params?.otherName || 'Chat'}</Text>
        {params?.otherUserId && (
          <Text variant="xs" color={onlineUserIds.has(params.otherUserId) ? colors.success : colors.textLight}>
            {onlineUserIds.has(params.otherUserId) ? 'Online' : 'Offline'}
          </Text>
        )}
      </View>
      
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <FlatList
          data={messages}
          keyExtractor={(m) => m._id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isMe = item.sender?._id === user?._id;
            return (
              <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowOther]}>
                <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
                  <Text variant="s" color={isMe ? colors.textInverted : colors.text}>{item.content}</Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={<View style={styles.center}><Text color={colors.textSecondary}>{t('chat.noMessages')}</Text></View>}
          ref={listRef}
        />
        
        {typingUserIds.size > 0 && (
          <View style={styles.typingRow}>
            <Text variant="xs" color={colors.textSecondary}>Typing...</Text>
          </View>
        )}
        
        <View style={styles.inputRow}>
          <Input
            placeholder={t('chat.placeholder')}
            value={text}
            onChangeText={(val) => {
              setText(val);
              if (user && params?.id) {
                socketService.startTyping(params.id, user._id);
                setTimeout(() => socketService.stopTyping(params.id, user._id), 1500);
              }
            }}
            containerStyle={{ flex: 1, marginBottom: 0 }}
          />
          <Button
            title="Send"
            onPress={() => {
              if (!text.trim()) return;
              sendMut.mutate(text);
              setText('');
            }}
            style={{ paddingHorizontal: spacing.l }}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  header: { padding: spacing.m, borderBottomWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  listContent: { padding: spacing.m, gap: spacing.s },
  msgRow: { flexDirection: 'row', marginBottom: 2 },
  msgRowMe: { justifyContent: 'flex-end' },
  msgRowOther: { justifyContent: 'flex-start' },
  bubble: { padding: spacing.m, borderRadius: layout.borderRadius.l, maxWidth: '80%' },
  bubbleMe: { backgroundColor: colors.primary, borderBottomRightRadius: 2 },
  bubbleOther: { backgroundColor: colors.surfaceHighlight, borderBottomLeftRadius: 2 },
  inputRow: { flexDirection: 'row', padding: spacing.m, borderTopWidth: 1, borderColor: colors.border, alignItems: 'flex-end', gap: spacing.s, backgroundColor: colors.surface },
  typingRow: { paddingHorizontal: spacing.m, paddingBottom: spacing.xs },
});
