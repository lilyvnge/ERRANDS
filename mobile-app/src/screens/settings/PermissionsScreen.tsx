import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { colors } from '../../theme/colors';
import { spacing, layout } from '../../theme/spacing';

type PermState = 'granted' | 'denied' | 'undetermined' | 'unavailable';

const formatStatus = (status?: string): PermState => {
  if (status === 'granted' || status === 'denied' || status === 'undetermined') return status;
  return 'unavailable';
};

export default function PermissionsScreen() {
  const [camera, setCamera] = useState<PermState>('undetermined');
  const [photos, setPhotos] = useState<PermState>('undetermined');
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const cam = await ImagePicker.getCameraPermissionsAsync();
      const lib = await ImagePicker.getMediaLibraryPermissionsAsync();
      setCamera(formatStatus(cam.status));
      setPhotos(formatStatus(lib.status));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const requestCamera = async () => {
    const res = await ImagePicker.requestCameraPermissionsAsync();
    setCamera(formatStatus(res.status));
  };

  const requestPhotos = async () => {
    const res = await ImagePicker.requestMediaLibraryPermissionsAsync();
    setPhotos(formatStatus(res.status));
  };

  const badgeColor = (status: PermState) => {
    if (status === 'granted') return colors.success;
    if (status === 'denied') return colors.error;
    if (status === 'undetermined') return colors.warning;
    return colors.textSecondary;
  };

  return (
    <Screen>
      <View style={styles.container}>
        <Text variant="xl" weight="bold">Permissions Check</Text>
        <Text variant="s" color={colors.textSecondary}>
          Use this screen to verify camera and photo permissions on the device.
        </Text>

        <Card style={styles.card}>
          <View style={styles.row}>
            <Text variant="m" weight="bold">Camera</Text>
            <View style={[styles.badge, { backgroundColor: badgeColor(camera) }]}>
              <Text variant="xs" color={colors.textInverted} weight="bold">
                {camera}
              </Text>
            </View>
          </View>
          <Button title="Request camera access" onPress={requestCamera} variant="outline" />
        </Card>

        <Card style={styles.card}>
          <View style={styles.row}>
            <Text variant="m" weight="bold">Photos</Text>
            <View style={[styles.badge, { backgroundColor: badgeColor(photos) }]}>
              <Text variant="xs" color={colors.textInverted} weight="bold">
                {photos}
              </Text>
            </View>
          </View>
          <Button title="Request photo access" onPress={requestPhotos} variant="outline" />
        </Card>

        <Button title={loading ? 'Refreshing...' : 'Refresh status'} onPress={refresh} loading={loading} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.m, gap: spacing.m },
  card: { gap: spacing.s },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: {
    paddingHorizontal: spacing.s,
    paddingVertical: 4,
    borderRadius: layout.borderRadius.round,
  },
});
