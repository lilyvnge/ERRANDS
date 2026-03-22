import React from 'react';
import { View, StyleSheet, TouchableOpacity, RefreshControl, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/useAuthStore';
import { useQuery } from '@tanstack/react-query';
import { disputeApi } from '../../api/disputes';
import { ratingApi } from '../../api/ratings';
import { taskApi } from '../../api/tasks';
import { useI18n } from '../../i18n/I18nProvider';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { colors } from '../../theme/colors';
import { spacing, layout } from '../../theme/spacing';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const nav = useNavigation<any>();
  const { lang, setLanguage, t } = useI18n();

  const { data: disputes = [], refetch: refetchDisputes, isRefetching: isRefreshingDisputes, isError: isDisputesError, error: disputesError } = useQuery({
    queryKey: ['my-disputes'],
    queryFn: () => disputeApi.listMine({ page: 1, limit: 10 }),
  });
  const { data: ratingSummary, refetch: refetchRating, isRefetching: isRefreshingRating } = useQuery({
    queryKey: ['rating-summary'],
    queryFn: ratingApi.summary,
  });
  const { data: myTasks = [], refetch: refetchTasks, isRefetching: isRefreshingTasks } = useQuery({
    queryKey: ['my-tasks', 'profile'],
    queryFn: () => taskApi.listMine({ type: 'employer', page: 1, limit: 5 }),
    enabled: user?.role === 'employer',
  });

  const renderDispute = ({ item }: { item: any }) => (
    <Card style={styles.disputeCard}>
      <View style={styles.disputeRow}>
        <Text variant="s" weight="bold">{item.title || 'Dispute'}</Text>
        <View style={[styles.badge, styles[`badge_${item.status}` as keyof typeof styles] || styles.badgeDefault]}>
          <Text variant="xs" color={colors.textInverted} weight="bold" style={{ textTransform: 'capitalize' }}>
            {item.status}
          </Text>
        </View>
      </View>
      <Text variant="xs" color={colors.textSecondary} style={{ marginTop: 4 }}>{item.type?.replace('_', ' ')}</Text>
      {item.task?.title && <Text variant="xs" color={colors.textSecondary}>Task: {item.task.title}</Text>}
    </Card>
  );

  return (
    <Screen>
      <FlatList
        contentContainerStyle={styles.container}
        data={disputes}
        keyExtractor={(d: any) => d._id}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshingDisputes || isRefreshingRating || isRefreshingTasks}
            onRefresh={() => {
              refetchDisputes();
              refetchRating();
              if (user?.role === 'employer') refetchTasks();
            }}
          />
        }
        ListHeaderComponent={
          <View style={{ gap: spacing.m }}>
            <View>
              <Text variant="xxl" weight="bold">{t('profile.title')}</Text>
            </View>

            <Card>
              <View style={styles.infoRow}>
                <View>
                  <Text variant="xs" color={colors.textSecondary}>Name</Text>
                  <Text variant="m" weight="medium">{user?.name || '-'}</Text>
                </View>
                <View>
                  <Text variant="xs" color={colors.textSecondary}>Role</Text>
                  <Text variant="m" weight="medium" style={{ textTransform: 'capitalize' }}>{user?.role || '-'}</Text>
                </View>
              </View>
              
              <View style={{ marginTop: spacing.s }}>
                <Text variant="xs" color={colors.textSecondary}>Email</Text>
                <Text variant="m" weight="medium">{user?.email || '-'}</Text>
              </View>

              {ratingSummary?.summary && (
                <View style={{ marginTop: spacing.s }}>
                  <Text variant="xs" color={colors.textSecondary}>Rating</Text>
                  <Text variant="m" weight="bold" color={colors.primary}>
                    {ratingSummary.summary.average?.toFixed?.(1) || ratingSummary.summary.average || 0} 
                    <Text variant="s" color={colors.textSecondary} weight="regular"> ({ratingSummary.summary.count || 0} reviews)</Text>
                  </Text>
                </View>
              )}
            </Card>

            <View style={styles.actions}>
              {user?.role === 'vendor' && (
                <Button 
                  title="Verification Status" 
                  variant="outline"
                  onPress={() => nav.navigate('VendorVerification')} 
                />
              )}
              <Button
                title="Permissions Check"
                variant="outline"
                onPress={() => nav.navigate('Permissions')}
              />
              <Button title={t('common.logout')} variant="secondary" onPress={() => logout()} />
            </View>

            <View>
              <Text variant="s" weight="bold" style={{ marginBottom: spacing.s }}>{t('profile.language')}</Text>
              <View style={styles.langRow}>
                {['en', 'sw', 'fr'].map((code) => (
                  <TouchableOpacity
                    key={code}
                    onPress={() => setLanguage(code as any)}
                    style={[styles.langPill, lang === code && styles.langPillActive]}
                  >
                    <Text variant="xs" color={lang === code ? colors.textInverted : colors.text} weight={lang === code ? 'bold' : 'regular'}>
                      {code.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {user?.role === 'employer' && (
              <View>
                <Text variant="l" weight="bold" style={{ marginBottom: spacing.s }}>My tasks</Text>
                {(myTasks as any[]).length === 0 ? (
                  <Text variant="s" color={colors.textSecondary}>No tasks yet.</Text>
                ) : (
                  (myTasks as any[]).map((t) => (
                    <Card key={t._id} style={{ marginBottom: spacing.s, padding: spacing.s }}>
                      <Text variant="s" weight="bold">{t.title}</Text>
                      <Text variant="xs" color={colors.textSecondary}>Status: {t.status}</Text>
                    </Card>
                  ))
                )}
              </View>
            )}

            <Text variant="l" weight="bold">My disputes</Text>
            {isDisputesError && <Text variant="s" color={colors.error}>{(disputesError as any)?.message || 'Failed to load disputes.'}</Text>}
          </View>
        }
        renderItem={renderDispute}
        ListEmptyComponent={<Text variant="s" color={colors.textSecondary}>No disputes yet.</Text>}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.m,
    gap: spacing.m,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actions: {
    gap: spacing.s,
  },
  disputeCard: {
    marginBottom: spacing.s,
  },
  disputeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: spacing.s,
    paddingVertical: 2,
    borderRadius: layout.borderRadius.round,
  },
  badge_open: { backgroundColor: colors.warning },
  badge_under_review: { backgroundColor: colors.primary },
  badge_resolved: { backgroundColor: colors.success },
  badge_closed: { backgroundColor: colors.textSecondary },
  badge_escalated: { backgroundColor: colors.error },
  badgeDefault: { backgroundColor: colors.textSecondary },
  langRow: {
    flexDirection: 'row',
    gap: spacing.s,
  },
  langPill: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.xs,
    borderRadius: layout.borderRadius.round,
    backgroundColor: colors.surface,
  },
  langPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
});
