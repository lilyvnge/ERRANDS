import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { taskApi } from '../../api/tasks';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import * as Location from 'expo-location';
import { useAuthStore } from '../../store/useAuthStore';
import { useToast } from '../../components/Toast/ToastProvider';
import { Picker } from '@react-native-picker/picker';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { colors } from '../../theme/colors';
import { spacing, layout } from '../../theme/spacing';

const styles = StyleSheet.create({
  container: { padding: spacing.m, gap: spacing.m },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  mapContainer: { height: 240, borderRadius: layout.borderRadius.m, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, marginTop: spacing.s },
  mapRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
  pickerWrap: { borderWidth: 1, borderColor: colors.border, borderRadius: layout.borderRadius.m, backgroundColor: colors.surface, overflow: 'hidden' },
  label: { marginBottom: 6, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 1 },
});

export default function CreateTaskScreen() {
  const nav = useNavigation<any>();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('laundry');
  const [budget, setBudget] = useState('');
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>({
    latitude: -1.286389, // Nairobi default
    longitude: 36.817223,
  });
  const [locLoading, setLocLoading] = useState(false);
  const [geocodeLoading, setGeocodeLoading] = useState(false);

  if (user?.role !== 'employer') {
    return (
      <Screen>
        <View style={styles.center}>
          <Text variant="xl" weight="bold">Post a Task</Text>
          <Text variant="m" color={colors.error} style={{ marginTop: spacing.m }}>
            Only employers can create tasks.
          </Text>
        </View>
      </Screen>
    );
  }

  const createMut = useMutation({
    mutationFn: taskApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      nav.goBack();
      toast.show('Task created successfully', 'success');
    },
    onError: (err: any) => {
      toast.show(err?.message || 'Failed to create task', 'error');
    }
  });

  const handleUseCurrentLocation = async () => {
    setLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        toast.show('Location permission denied', 'error');
        return;
      }
      const current = await Location.getCurrentPositionAsync({});
      setCoords({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      });
      await reverseGeocode(current.coords.latitude, current.coords.longitude);
    } catch (err) {
      console.warn(err);
      toast.show('Unable to fetch location', 'error');
    } finally {
      setLocLoading(false);
    }
  };

  const reverseGeocode = async (latitude: number, longitude: number) => {
    setGeocodeLoading(true);
    try {
      const results = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (results && results.length > 0) {
        const place = results[0];
        const parts = [
          place.name,
          place.street,
          place.city,
          place.subregion,
          place.region
        ].filter(Boolean);
        if (parts.length > 0) {
          setAddress(parts.join(', '));
        }
      }
    } catch (err) {
      console.warn('Reverse geocode failed', err);
    } finally {
      setGeocodeLoading(false);
    }
  };

  const handleSubmit = () => {
    const budgetNum = Number(budget);
    if (!title || !description || Number.isNaN(budgetNum) || !address || !coords) {
      toast.show('Fill all required fields', 'error');
      return;
    }
    const normalizedCategory = category.trim().toLowerCase().replace(/\s+/g, '-');
    createMut.mutate({
      title,
      description,
      category: normalizedCategory,
      budget: budgetNum,
      location: address && coords ? { address, coordinates: [coords.longitude, coords.latitude] as [number, number] } : undefined,
    });
  };

  return (
    <Screen scroll>
      <View style={styles.container}>
        <Text variant="xxl" weight="bold" style={{ marginBottom: spacing.s }}>Post a Task</Text>
        
        <Card>
          <Input 
            label="Task Title"
            placeholder="e.g. House Cleaning" 
            value={title} 
            onChangeText={setTitle} 
          />
          
          <Input
            label="Description"
            placeholder="Describe what you need done..."
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
            style={{ minHeight: 100, textAlignVertical: 'top' }}
          />

          <View style={{ marginBottom: spacing.m }}>
            <Text variant="xs" color={colors.textSecondary} style={styles.label}>Category</Text>
            <View style={styles.pickerWrap}>
              <Picker
                selectedValue={category}
                onValueChange={(val) => setCategory(val)}
                style={{ color: colors.text }}
              >
                <Picker.Item label="Laundry" value="laundry" />
                <Picker.Item label="Cleaning" value="cleaning" />
                <Picker.Item label="Water Delivery" value="water-delivery" />
                <Picker.Item label="Grocery Shopping" value="grocery-shopping" />
                <Picker.Item label="Food Delivery" value="food-delivery" />
                <Picker.Item label="Errand Running" value="errand-running" />
                <Picker.Item label="Plumbing" value="plumbing" />
                <Picker.Item label="Electrical" value="electrical" />
                <Picker.Item label="Carpentry" value="carpentry" />
                <Picker.Item label="Babysitting" value="babysitting" />
                <Picker.Item label="Gardening" value="gardening" />
                <Picker.Item label="Pet Care" value="petcare" />
                <Picker.Item label="Moving Assistance" value="moving" />
                <Picker.Item label="Other" value="other" />
              </Picker>
            </View>
          </View>

          <Input 
            label="Budget (KES)"
            placeholder="e.g. 1500" 
            keyboardType="numeric" 
            value={budget} 
            onChangeText={setBudget} 
          />
        </Card>

        <Card>
          <Text variant="s" weight="bold" style={{ marginBottom: spacing.s }}>Location</Text>
          
          <Input 
            placeholder="Address / Location" 
            value={address} 
            onChangeText={setAddress} 
          />

          <View style={styles.mapRow}>
            <Text variant="xs" color={colors.textSecondary}>
              {geocodeLoading ? 'Updating address...' : 'Tap map to refine location'}
            </Text>
            <TouchableOpacity onPress={handleUseCurrentLocation} disabled={locLoading}>
              <Text variant="s" weight="bold" color={colors.primary}>
                {locLoading ? 'Locating...' : 'Use my location'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.mapContainer}>
            {coords && (
              <MapView
                style={StyleSheet.absoluteFill}
                region={{
                  latitude: coords.latitude,
                  longitude: coords.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                onPress={(e) => {
                  const { latitude, longitude } = e.nativeEvent.coordinate;
                  setCoords({ latitude, longitude });
                  reverseGeocode(latitude, longitude);
                }}
              >
                <UrlTile urlTemplate="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maximumZ={19} />
                <Marker
                  coordinate={coords}
                  draggable
                  onDragEnd={(e) => {
                    const { latitude, longitude } = e.nativeEvent.coordinate;
                    setCoords({ latitude, longitude });
                    reverseGeocode(latitude, longitude);
                  }}
                />
              </MapView>
            )}
          </View>
        </Card>

        <Button 
          title={createMut.isPending ? 'Posting...' : 'Create Task'} 
          onPress={handleSubmit} 
          loading={createMut.isPending}
          style={{ marginTop: spacing.s }}
        />
      </View>
    </Screen>
  );
}
