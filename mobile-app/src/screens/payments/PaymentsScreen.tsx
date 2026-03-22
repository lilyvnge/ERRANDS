import React from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { paymentApi } from '../../api/payments';
import { useI18n } from '../../i18n/I18nProvider';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
import { colors } from '../../theme/colors';
import { spacing, layout } from '../../theme/spacing';

export default function PaymentsScreen() {
  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['payments'],
    queryFn: () => paymentApi.getMyPayments(1),
  });
  const { t } = useI18n();

  if (isLoading) {
    return <Screen><View style={styles.center}><Text>Loading payments...</Text></View></Screen>;
  }
  if (isError) {
    return <Screen><View style={styles.center}><Text color={colors.error}>{(error as any)?.message || 'Failed to load payments.'}</Text></View></Screen>;
  }

  const payments = data?.payments || data || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return colors.success;
      case 'confirmed': return colors.success;
      case 'pending': return colors.warning;
      case 'initiated': return colors.primary;
      case 'failed': return colors.error;
      case 'cancelled': return colors.textLight;
      default: return colors.textSecondary;
    }
  };

  return (
    <Screen>
      <FlatList
        contentContainerStyle={styles.container}
        data={payments}
        keyExtractor={(p: any) => p._id}
        ListEmptyComponent={<View style={styles.center}><Text color={colors.textSecondary}>{t('payments.empty')}</Text></View>}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.row}>
              <Text variant="s" weight="bold" style={styles.title}>{item.task?.title || 'Task payment'}</Text>
              <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) }]}>
                <Text variant="xs" color={colors.textInverted} weight="bold" style={{ textTransform: 'uppercase' }}>
                  {item.status}
                </Text>
              </View>
            </View>
            
            <Text variant="xl" weight="heavy" color={colors.primary} style={{ marginVertical: spacing.xs }}>
              KES {item.amount?.toLocaleString?.() || item.amount}
            </Text>
            
            <Text variant="xs" color={colors.textSecondary}>
              Method: <Text variant="xs" weight="medium" color={colors.text}>{item.paymentMethod}</Text>
            </Text>
            {item.createdAt && (
              <Text variant="xs" color={colors.textLight} style={{ marginTop: 2 }}>
                {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            )}
          </Card>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.m, gap: spacing.m },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  card: { gap: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { flex: 1, marginRight: spacing.s },
  badge: { paddingHorizontal: spacing.s, paddingVertical: 2, borderRadius: layout.borderRadius.round },
});
