import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { vendorApi } from '../../api/vendors';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
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
    description?: string;
  };
};

const toRad = (val: number) => (val * Math.PI) / 180;

const getDistanceKm = (a?: [number, number], b?: { latitude: number; longitude: number } | null) => {
  if (!a || !b) return null;
  const [lng, lat] = a;
  const R = 6371;
  const dLat = toRad(b.latitude - lat);
  const dLng = toRad(b.longitude - lng);
  const lat1 = toRad(lat);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
};

export default function VendorProfileScreen() {
  const { params } = useRoute<any>();
  const { data, isLoading, isError, error } = useQuery<Vendor>({
    queryKey: ['vendor', params?.id],
    queryFn: () => vendorApi.getById(params.id),
  });

  const distanceKm = useMemo(() => {
    return getDistanceKm(data?.location?.coordinates, params?.userCoords);
  }, [data?.location?.coordinates, params?.userCoords]);

  if (isLoading || !data) {
    return <Screen><View style={styles.center}><Text>Loading vendor...</Text></View></Screen>;
  }
  if (isError) {
    return <Screen><View style={styles.center}><Text color={colors.error}>{(error as any)?.message || 'Failed to load vendor.'}</Text></View></Screen>;
  }

  return (
    <Screen scroll>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text variant="xxl" weight="bold">{data.name}</Text>
            {data.vendorProfile?.isVerified && (
              <View style={styles.badge}>
                <Text variant="xs" color={colors.textInverted} weight="bold">Verified Vendor</Text>
              </View>
            )}
          </View>
          {data.vendorProfile?.rating?.average != null && (
            <View style={styles.ratingBox}>
              <Text variant="l" weight="heavy" color={colors.primary}>{data.vendorProfile.rating.average.toFixed(1)}</Text>
              <Text variant="xs" color={colors.textSecondary}>{data.vendorProfile.rating.count || 0} reviews</Text>
            </View>
          )}
        </View>

        {data.vendorProfile?.description && (
          <Text variant="m" color={colors.text} style={{ lineHeight: 24 }}>
            {data.vendorProfile.description}
          </Text>
        )}

        <Card>
          <Text variant="s" weight="bold" style={{ marginBottom: spacing.s }}>Details</Text>
          
          <View style={styles.row}>
            <Text variant="s" color={colors.textSecondary}>Location</Text>
            <Text variant="s" weight="medium" style={{ flex: 1, textAlign: 'right' }}>{data.location?.address || 'No location'}</Text>
          </View>
          
          {distanceKm != null && (
            <View style={styles.row}>
              <Text variant="s" color={colors.textSecondary}>Distance</Text>
              <Text variant="s" weight="medium">{distanceKm.toFixed(1)} km away</Text>
            </View>
          )}

          {data.vendorProfile?.hourlyRate && (
            <View style={styles.row}>
              <Text variant="s" color={colors.textSecondary}>Hourly Rate</Text>
              <Text variant="s" weight="bold" color={colors.success}>KES {data.vendorProfile.hourlyRate}/hr</Text>
            </View>
          )}
        </Card>

        <Card>
          <Text variant="s" weight="bold" style={{ marginBottom: spacing.s }}>Skills</Text>
          <View style={styles.skillsRow}>
            {(data.vendorProfile?.skills || []).map((skill, idx) => (
              <View key={idx} style={styles.skillPill}>
                <Text variant="xs" color={colors.primary}>{skill}</Text>
              </View>
            ))}
            {(!data.vendorProfile?.skills || data.vendorProfile.skills.length === 0) && (
              <Text variant="s" color={colors.textSecondary}>No skills listed.</Text>
            )}
          </View>
        </Card>

        <Card>
          <Text variant="s" weight="bold" style={{ marginBottom: spacing.s }}>Contact</Text>
          {data.email && (
            <View style={styles.row}>
              <Text variant="s" color={colors.textSecondary}>Email</Text>
              <Text variant="s" weight="medium">{data.email}</Text>
            </View>
          )}
          {data.phone && (
            <View style={styles.row}>
              <Text variant="s" color={colors.textSecondary}>Phone</Text>
              <Text variant="s" weight="medium">{data.phone}</Text>
            </View>
          )}
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.m, gap: spacing.m },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.s },
  badge: { backgroundColor: colors.success, paddingHorizontal: 8, paddingVertical: 4, borderRadius: layout.borderRadius.round, alignSelf: 'flex-start', marginTop: 4 },
  ratingBox: { alignItems: 'center', backgroundColor: colors.surfaceHighlight, padding: spacing.s, borderRadius: layout.borderRadius.m },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.s },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s },
  skillPill: { backgroundColor: colors.surfaceHighlight, paddingHorizontal: spacing.m, paddingVertical: spacing.xs, borderRadius: layout.borderRadius.round, borderWidth: 1, borderColor: colors.primaryLight },
});
