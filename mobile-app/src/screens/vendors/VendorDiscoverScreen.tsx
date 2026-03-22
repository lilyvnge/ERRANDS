import React, { useMemo, useState } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { vendorApi } from '../../api/vendors';
import { useToast } from '../../components/Toast/ToastProvider';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { colors } from '../../theme/colors';
import { spacing, layout } from '../../theme/spacing';

type Vendor = {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  location?: { address?: string; coordinates?: [number, number] };
  vendorProfile?: {
    skills?: string[];
    isVerified?: boolean;
    rating?: { average?: number; count?: number };
    hourlyRate?: number;
  };
};

export default function VendorDiscoverScreen() {
  const nav = useNavigation<any>();
  const toast = useToast();
  const [category, setCategory] = useState('');
  const [distance, setDistance] = useState('10');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locLoading, setLocLoading] = useState(false);

  const filters = useMemo(() => ({
    category: category.trim() || undefined,
    latitude: coords?.latitude,
    longitude: coords?.longitude,
    maxDistance: distance ? Number(distance) : undefined,
  }), [category, coords, distance]);

  const { data = [], isLoading, isError, error, refetch, isRefetching } = useQuery<Vendor[]>({
    queryKey: ['vendors', filters],
    queryFn: () => vendorApi.listVerified(filters),
  });

  const handleUseLocation = async () => {
    setLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        toast.show('Location permission denied', 'error');
        return;
      }
      const current = await Location.getCurrentPositionAsync({});
      setCoords({ latitude: current.coords.latitude, longitude: current.coords.longitude });
      refetch();
    } catch (err) {
      toast.show('Unable to fetch location', 'error');
    } finally {
      setLocLoading(false);
    }
  };

  return (
    <Screen>
      <FlatList
        contentContainerStyle={styles.container}
        data={data}
        keyExtractor={(v) => v._id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text variant="xl" weight="bold">Nearby verified vendors</Text>
            <Input
              placeholder="Skill/category (e.g., plumbing)"
              value={category}
              onChangeText={setCategory}
              containerStyle={{ marginBottom: spacing.s }}
            />
            <View style={styles.filterRow}>
              <Input
                placeholder="Max km"
                keyboardType="numeric"
                value={distance}
                onChangeText={setDistance}
                containerStyle={{ flex: 1, marginBottom: 0 }}
              />
              <Button
                title={locLoading ? 'Locating...' : 'Use my location'}
                onPress={handleUseLocation}
                disabled={locLoading}
                variant="secondary"
                style={{ flex: 1 }}
              />
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text color={colors.textSecondary}>
              {isLoading ? 'Loading vendors...' : isError ? ((error as any)?.message || 'Failed to load vendors.') : 'No vendors found.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => nav.navigate('VendorProfile', { id: item._id, userCoords: coords })}
            activeOpacity={0.8}
          >
            <Card style={styles.card}>
              <View style={styles.row}>
                <Text variant="m" weight="bold">{item.name}</Text>
                {item.vendorProfile?.isVerified && (
                  <View style={styles.badge}>
                    <Text variant="xs" color={colors.textInverted} weight="bold">Verified</Text>
                  </View>
                )}
              </View>
              
              <Text variant="s" color={colors.textSecondary}>{item.location?.address || '-'}</Text>
              
              <View style={{ marginTop: spacing.xs }}>
                <Text variant="xs" color={colors.textSecondary}>Skills</Text>
                <Text variant="s" weight="medium">{(item.vendorProfile?.skills || []).join(', ') || '-'}</Text>
              </View>

              <View style={styles.metaRow}>
                {item.vendorProfile?.rating?.average != null && (
                  <Text variant="s" weight="bold" color={colors.primary}>
                    ★ {item.vendorProfile.rating.average.toFixed(1)} <Text variant="xs" color={colors.textSecondary} weight="regular">({item.vendorProfile.rating.count || 0})</Text>
                  </Text>
                )}
                {item.vendorProfile?.hourlyRate && (
                  <Text variant="s" weight="bold" color={colors.success}>
                    KES {item.vendorProfile.hourlyRate}/hr
                  </Text>
                )}
              </View>
            </Card>
          </TouchableOpacity>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.m, gap: spacing.m },
  center: { padding: spacing.xl, alignItems: 'center' },
  header: { gap: spacing.s, marginBottom: spacing.s },
  filterRow: { flexDirection: 'row', gap: spacing.s, alignItems: 'flex-end' },
  card: { gap: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { backgroundColor: colors.success, paddingHorizontal: 6, paddingVertical: 2, borderRadius: layout.borderRadius.round },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.s },
});
