import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, FlatList, TouchableOpacity, RefreshControl, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { taskApi, Task } from '../../api/tasks';
import { useAuthStore } from '../../store/useAuthStore';
import { useToast } from '../../components/Toast/ToastProvider';
import { useI18n } from '../../i18n/I18nProvider';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { colors } from '../../theme/colors';
import { spacing, layout } from '../../theme/spacing';

export default function TaskFeedScreen() {
  const nav = useNavigation<any>();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const toast = useToast();
  const { t } = useI18n();
  const [status, setStatus] = useState<'all' | 'open' | 'assigned' | 'in-progress' | 'completion-requested' | 'completed' | 'cancelled' | 'disputed'>('all');
  const [urgency, setUrgency] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [category, setCategory] = useState('');

  const filters = useMemo(() => ({
    status: status !== 'all' ? status : undefined,
    urgency: urgency !== 'all' ? urgency : undefined,
    category: category.trim() || undefined,
  }), [status, urgency, category]);

  const queryKey = user?.role === 'employer' ? ['my-tasks', filters] : ['tasks', filters];
  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey,
    queryFn: () => (user?.role === 'employer' ? taskApi.listMine(filters) : taskApi.list(filters)),
  });

  const prevStatusRef = useRef<Record<string, { status: string; assignedVendor?: string }>>({});
  useEffect(() => {
    if (user?.role !== 'employer') return;
    const list = (data || []) as Task[];
    const prev = prevStatusRef.current;
    list.forEach((t) => {
      const prevItem = prev[t._id];
      if (prevItem && prevItem.status !== t.status) {
        if (t.status === 'assigned') {
          toast.show(`Task assigned: ${t.title}${t.assignedVendor?.name ? ` to ${t.assignedVendor.name}` : ''}`, 'info');
        }
        if (t.status === 'completion-requested') {
          toast.show(`Completion requested for: ${t.title}`, 'info');
        }
      }
      prev[t._id] = { status: t.status, assignedVendor: t.assignedVendor?.name };
    });
  }, [data, user?.role]);

  const renderItem = ({ item }: { item: Task }) => (
    <TouchableOpacity onPress={() => nav.navigate('TaskDetails', { id: item._id })} activeOpacity={0.9}>
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Text variant="m" weight="bold" style={styles.title} numberOfLines={1}>{item.title}</Text>
          <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text variant="xs" weight="bold" color={colors.textInverted} style={{ textTransform: 'capitalize' }}>
              {item.status.replace('-', ' ')}
            </Text>
          </View>
        </View>
        
        <Text variant="s" color={colors.textSecondary} style={styles.meta}>
          {item.location?.address || 'No location'}
        </Text>
        
        <View style={styles.row}>
          <Text variant="s" weight="bold" color={colors.primary}>
            KES {item.budget?.toLocaleString?.() || item.budget}
          </Text>
          {item.paymentStatus && (
            <Text variant="xs" weight="bold" color={colors.success} style={{ textTransform: 'uppercase' }}>
              {item.paymentStatus}
            </Text>
          )}
        </View>

        <Text variant="s" color={colors.text} numberOfLines={2} style={styles.desc}>
          {item.description}
        </Text>
      </Card>
    </TouchableOpacity>
  );

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'open': return colors.warning;
      case 'assigned': return colors.primary;
      case 'in-progress': return colors.primaryDark;
      case 'completed': return colors.success;
      case 'cancelled': return colors.textLight;
      case 'disputed': return colors.error;
      default: return colors.textSecondary;
    }
  };

  if (isLoading) return <Screen><View style={styles.center}><Text>Loading tasks...</Text></View></Screen>;
  if (isError) return <Screen><View style={styles.center}><Text color={colors.error}>{(error as any)?.message || 'Failed to load tasks.'}</Text></View></Screen>;

  return (
    <Screen>
      <FlatList
        data={data || []}
        keyExtractor={(t) => t._id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { qc.invalidateQueries({ queryKey }); refetch(); }} />}
        ListEmptyComponent={<View style={styles.center}><Text color={colors.textSecondary}>{t('tasks.empty')}</Text></View>}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            {user?.role === 'employer' && (
              <Button
                title={`+ ${t('tasks.post')}`}
                onPress={() => nav.navigate('CreateTask')}
                style={{ marginBottom: spacing.m }}
              />
            )}
            {user?.role === 'vendor' && (
              <Card variant="flat" style={styles.vendorHint}>
                <Text variant="s" color={colors.primaryDark} weight="medium">
                  {user.vendorProfile?.isVerified
                    ? 'Browse jobs and accept ones that match your skills.'
                    : 'Complete verification to accept jobs.'}
                </Text>
              </Card>
            )}

            <View style={styles.filterGroup}>
              <Text variant="s" weight="bold" style={styles.filterLabel}>{t('tasks.status')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                {['all', 'open', 'assigned', 'in-progress', 'completion-requested', 'completed', 'cancelled', 'disputed'].map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.filterPill, status === s && styles.filterPillActive]}
                    onPress={() => setStatus(s as any)}
                  >
                    <Text variant="xs" color={status === s ? colors.textInverted : colors.text} weight={status === s ? 'bold' : 'regular'}>
                      {s.replace('-', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.filterGroup}>
              <Text variant="s" weight="bold" style={styles.filterLabel}>{t('tasks.urgency')}</Text>
              <View style={styles.filterRow}>
                {['all', 'low', 'medium', 'high'].map((u) => (
                  <TouchableOpacity
                    key={u}
                    style={[styles.filterPill, urgency === u && styles.filterPillActive]}
                    onPress={() => setUrgency(u as any)}
                  >
                    <Text variant="xs" color={urgency === u ? colors.textInverted : colors.text} weight={urgency === u ? 'bold' : 'regular'}>
                      {u}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Input
              placeholder={t('tasks.searchCategory')}
              value={category}
              onChangeText={setCategory}
              containerStyle={{ marginBottom: 0 }}
            />
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: spacing.m,
    gap: spacing.m,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  header: {
    gap: spacing.m,
    marginBottom: spacing.s,
  },
  card: {
    gap: spacing.xs,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.s,
  },
  title: {
    flex: 1,
  },
  badge: {
    paddingHorizontal: spacing.s,
    paddingVertical: 2,
    borderRadius: layout.borderRadius.round,
  },
  meta: {
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  desc: {
    marginTop: spacing.xs,
  },
  vendorHint: {
    backgroundColor: colors.surfaceHighlight,
    marginBottom: spacing.m,
  },
  filterGroup: {
    gap: spacing.xs,
  },
  filterLabel: {
    marginLeft: spacing.xs,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
  },
  filterPill: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.xs,
    borderRadius: layout.borderRadius.round,
    backgroundColor: colors.surface,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
});
