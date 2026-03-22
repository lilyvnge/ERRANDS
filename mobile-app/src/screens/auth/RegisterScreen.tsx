import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../api/client';
import { useAuthStore } from '../../store/useAuthStore';
import { useToast } from '../../components/Toast/ToastProvider';
import { useI18n } from '../../i18n/I18nProvider';
import * as Location from 'expo-location';
import MapView, { Marker, UrlTile } from 'react-native-maps';

export default function RegisterScreen() {
  const nav = useNavigation<any>();
  const login = useAuthStore((s) => s.login); // reuse login after successful registration
  const toast = useToast();
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'employer' | 'vendor'>('employer');
  const [skills, setSkills] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>({
    latitude: -1.286389,
    longitude: 36.817223
  });
  const [locLoading, setLocLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password || !phone || !address || !coords) {
      return toast.show('Fill all required fields', 'error');
    }
    if (role === 'vendor' && skills.length === 0) {
      return toast.show('Select at least one skill', 'error');
    }
    setLoading(true);
    try {
      const payload = {
        name,
        email,
        phone,
        password,
        role,
        location: {
          address,
          coordinates: [coords.longitude, coords.latitude]
        },
        vendorProfile: role === 'vendor' ? {
          skills,
          description,
          hourlyRate: hourlyRate ? Number(hourlyRate) : undefined
        } : undefined
      };
      await api.post('/auth/register', payload);
      await login(email, password); // auto-login
    } catch (err: any) {
      toast.show(err?.message || 'Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateAddressFromCoords = async (latitude: number, longitude: number) => {
    try {
      const results = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (results?.length) {
        const place = results[0];
        const parts = [place.name, place.street, place.city, place.subregion, place.region].filter(Boolean);
        if (parts.length) setAddress(parts.join(', '));
      }
    } catch (err) {
      // Ignore reverse geocode failures; user can still enter address manually.
    }
  };

  const toggleSkill = (skill: string) => {
    setSkills((prev) => prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]);
  };

  const handleUseLocation = async () => {
    setLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        toast.show('Location permission denied', 'error');
        return;
      }
      const current = await Location.getCurrentPositionAsync({});
      const next = { latitude: current.coords.latitude, longitude: current.coords.longitude };
      setCoords(next);
      await updateAddressFromCoords(next.latitude, next.longitude);
    } catch (err) {
      toast.show('Unable to fetch location', 'error');
    } finally {
      setLocLoading(false);
    }
  };

  const handleMapPick = async (latitude: number, longitude: number) => {
    setCoords({ latitude, longitude });
    await updateAddressFromCoords(latitude, longitude);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t('auth.register')}</Text>

      <View style={styles.roleRow}>
        <TouchableOpacity onPress={() => setRole('employer')} style={[styles.roleBtn, role === 'employer' && styles.roleSelected]}>
          <Text style={role === 'employer' ? styles.roleTextSelected : styles.roleText}>Employer</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setRole('vendor')} style={[styles.roleBtn, role === 'vendor' && styles.roleSelected]}>
          <Text style={role === 'vendor' ? styles.roleTextSelected : styles.roleText}>Vendor</Text>
        </TouchableOpacity>
      </View>

      <TextInput style={styles.input} placeholder={t('auth.name')} value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder={t('auth.email')} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <TextInput style={styles.input} placeholder={t('auth.phone')} keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
      <TextInput style={styles.input} placeholder={t('auth.password')} secureTextEntry value={password} onChangeText={setPassword} />

      <Text style={styles.sectionTitle}>Location</Text>
      <TextInput style={styles.input} placeholder="Address" value={address} onChangeText={setAddress} />
      <TouchableOpacity style={styles.locationBtn} onPress={handleUseLocation} disabled={locLoading}>
        <Text style={styles.locationText}>{locLoading ? 'Locating...' : 'Use my location'}</Text>
      </TouchableOpacity>
      <View style={styles.mapContainer}>
        {coords && (
          <MapView
            style={StyleSheet.absoluteFill}
            region={{ latitude: coords.latitude, longitude: coords.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
            onPress={(e) => handleMapPick(e.nativeEvent.coordinate.latitude, e.nativeEvent.coordinate.longitude)}
          >
            <UrlTile urlTemplate="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maximumZ={19} />
            <Marker
              coordinate={coords}
              draggable
              onDragEnd={(e) => handleMapPick(e.nativeEvent.coordinate.latitude, e.nativeEvent.coordinate.longitude)}
            />
          </MapView>
        )}
      </View>

      {role === 'vendor' && (
        <>
          <Text style={styles.sectionTitle}>Vendor profile</Text>
          <Text style={styles.helper}>Select your skills</Text>
          <View style={styles.skillWrap}>
            {[
              'laundry', 'cleaning', 'delivery', 'shopping', 'plumbing', 'electrical',
              'carpentry', 'babysitting', 'gardening', 'petcare', 'moving', 'other'
            ].map((skill) => (
              <TouchableOpacity
                key={skill}
                style={[styles.skillChip, skills.includes(skill) && styles.skillChipActive]}
                onPress={() => toggleSkill(skill)}
              >
                <Text style={[styles.skillText, skills.includes(skill) && styles.skillTextActive]}>
                  {skill.replace('-', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
            placeholder="Short bio / description"
            value={description}
            onChangeText={setDescription}
            multiline
          />
          <TextInput
            style={styles.input}
            placeholder="Hourly rate (KES)"
            keyboardType="numeric"
            value={hourlyRate}
            onChangeText={setHourlyRate}
          />
        </>
      )}

      <Button title={loading ? '...' : t('auth.register')} onPress={handleRegister} disabled={loading} />

      <TouchableOpacity onPress={() => nav.navigate('Login')} style={{ marginTop: 16 }}>
        <Text style={{ textAlign: 'center', color: '#2563eb' }}>Already have an account? {t('auth.login')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, gap: 12 },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12 },
  roleRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginVertical: 6 },
  roleBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#ccc' },
  roleSelected: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  roleText: { color: '#111', fontWeight: '600' },
  roleTextSelected: { color: '#fff', fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 6 },
  helper: { fontSize: 12, color: '#555' },
  mapContainer: { height: 200, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#ddd' },
  locationBtn: { backgroundColor: '#2563eb', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  locationText: { color: '#fff', fontWeight: '700' },
  skillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillChip: { borderWidth: 1, borderColor: '#ddd', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 10 },
  skillChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  skillText: { fontSize: 12, color: '#333' },
  skillTextActive: { color: '#fff', fontWeight: '700' },
});
