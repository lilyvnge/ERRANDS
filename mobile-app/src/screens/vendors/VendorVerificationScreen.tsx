import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, FlatList, Image } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { verificationApi } from '../../api/verification';
import { useAuthStore } from '../../store/useAuthStore';
import { useToast } from '../../components/Toast/ToastProvider';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { colors } from '../../theme/colors';
import { spacing, layout } from '../../theme/spacing';

type DocRow = {
  documentType: string;
  documentUrl: string;
  fileName?: string;
};

export default function VendorVerificationScreen() {
  const { user } = useAuthStore();
  const toast = useToast();
  const qc = useQueryClient();
  const [docs, setDocs] = useState<DocRow[]>([{ documentType: 'id_card', documentUrl: '' }]);
  const [selfie, setSelfie] = useState<{ dataUrl: string; fileName: string } | null>(null);
  const docTypes = [
    { value: 'id_card', label: 'ID Card' },
    { value: 'passport', label: 'Passport' },
    { value: 'driver_license', label: 'Driver License' },
    { value: 'business_license', label: 'Business License' },
    { value: 'proof_of_address', label: 'Proof of Address' },
    { value: 'certificate', label: 'Certificate' },
    { value: 'Other', label: 'Other' }
  ];

  const { data: status, isLoading, isError, error } = useQuery({
    queryKey: ['verification-status'],
    queryFn: verificationApi.status,
    enabled: user?.role === 'vendor',
  });

  const submitMut = useMutation({
    mutationFn: (payload: DocRow[]) => verificationApi.submit(payload.map(d => ({ documentType: d.documentType, documentUrl: d.documentUrl }))),
    onSuccess: () => {
      toast.show('Documents sent for review', 'success');
      qc.invalidateQueries({ queryKey: ['verification-status'] });
    },
    onError: (err: any) => {
      const msg = err?.message || err?.error || err?.response?.data?.message || 'Submit failed';
      toast.show(msg, 'error');
    },
  });

  const pickFile = async (idx: number) => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
      copyToCacheDirectory: true,
      multiple: false
    });
    if (result.canceled) return;
    const file = result.assets?.[0] || (result as any);
    if (!file?.uri) {
      toast.show('No file selected', 'error');
      return;
    }
    if (file.size && file.size > 5 * 1024 * 1024) {
      toast.show('File too large (max 5MB)', 'error');
      return;
    }
    try {
      let uriToRead = file.uri;
      try {
        const info = await FileSystem.getInfoAsync(uriToRead);
        if (!info.exists) {
          throw new Error('File not accessible');
        }
      } catch {
        const safeName = file.name || `document_${Date.now()}`;
        const dest = `${FileSystem.cacheDirectory}${safeName}`;
        await FileSystem.copyAsync({ from: file.uri, to: dest });
        uriToRead = dest;
      }

      const base64 = await FileSystem.readAsStringAsync(uriToRead, { encoding: FileSystem.EncodingType.Base64 });
      const mime = file.mimeType || 'application/octet-stream';
      const dataUrl = `data:${mime};base64,${base64}`;
      setDocs(prev => prev.map((d, i) => i === idx ? { ...d, documentUrl: dataUrl, fileName: file.name || 'document' } : d));
      toast.show('File selected', 'success');
    } catch (err: any) {
      console.warn('File read failed', err);
      toast.show(err?.message || 'Could not read file', 'error');
    }
  };

  const captureSelfie = async (cameraType: 'front' | 'back') => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      toast.show('Camera permission denied', 'error');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
      base64: true,
      cameraType: cameraType === 'front'
        ? ImagePicker.CameraType.front
        : ImagePicker.CameraType.back
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset?.uri) {
      toast.show('No image captured', 'error');
      return;
    }
    try {
      let dataUrl = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : '';
      if (!dataUrl) {
        const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
        dataUrl = `data:image/jpeg;base64,${base64}`;
      }
      setSelfie({ dataUrl, fileName: `selfie-${cameraType}.jpg` });
      toast.show('Selfie captured', 'success');
    } catch (err: any) {
      toast.show(err?.message || 'Could not read selfie', 'error');
    }
  };

  const addRow = () => setDocs(prev => [...prev, { documentType: 'id_card', documentUrl: '' }]);
  const removeRow = (idx: number) => setDocs(prev => prev.filter((_, i) => i !== idx));

  if (user?.role !== 'vendor') {
    return <Screen><View style={styles.center}><Text>Verification is only for vendors.</Text></View></Screen>;
  }

  const badge = (() => {
    if (status?.status === 'verified') return { text: 'Verified', color: colors.success };
    if (status?.status === 'pending') return { text: 'Pending', color: colors.warning };
    if (status?.status === 'rejected') return { text: 'Rejected', color: colors.error };
    return { text: 'Unverified', color: colors.textSecondary };
  })();

  return (
    <Screen>
      <FlatList
        contentContainerStyle={styles.container}
        data={docs}
        keyExtractor={(_, idx) => String(idx)}
        ListHeaderComponent={
          <View style={{ gap: spacing.m }}>
            <View>
              <Text variant="xl" weight="bold">Vendor verification</Text>
              <View style={[styles.statusBadge, { backgroundColor: badge.color }]}>
                <Text variant="s" color={colors.textInverted} weight="bold">
                  Status: {isLoading ? 'Loading...' : isError ? ((error as any)?.message || 'Error') : badge.text}
                </Text>
              </View>
            </View>

            {status?.rejectionReason && (
              <Card style={{ backgroundColor: '#fef2f2', borderColor: '#fee2e2' }}>
                <Text variant="s" weight="bold" color={colors.error}>Rejection reason:</Text>
                <Text variant="s" color={colors.error}>{status.rejectionReason}</Text>
              </Card>
            )}

            <Card variant="flat">
              <Text variant="s" color={colors.textSecondary}>
                Upload documents (image/PDF). Accepted types: ID CARD, PASSPORT, CERTIFICATES.
              </Text>
              <Text variant="s" color={colors.textSecondary} style={{ marginTop: spacing.s }}>
                Note: Ensure you also upload certificates for any Technical skills e.g electrical, veterinary
              </Text>
            </Card>

            <Card variant="flat">
              <Text variant="s" weight="bold">Selfie verification</Text>
              <Text variant="s" color={colors.textSecondary} style={{ marginTop: spacing.xs }}>
                Take a clear selfie using the front or back camera.
              </Text>
              <View style={styles.selfieRow}>
                <Button title="Front camera" onPress={() => captureSelfie('front')} />
                <Button title="Back camera" onPress={() => captureSelfie('back')} variant="outline" />
              </View>
              {selfie?.fileName && (
                <Text variant="xs" color={colors.textSecondary} style={{ marginTop: 4 }}>
                  Selfie: {selfie.fileName}
                </Text>
              )}
              {selfie?.dataUrl && (
                <View style={styles.selfiePreview}>
                  <Image
                    source={{ uri: selfie.dataUrl }}
                    style={styles.selfieThumb}
                  />
                  <Button title="Retake" onPress={() => setSelfie(null)} variant="outline" />
                </View>
              )}
            </Card>
          </View>
        }
        renderItem={({ item, index }) => (
          <Card style={styles.card}>
            <View style={styles.pickerWrap}>
              <Picker
                selectedValue={item.documentType}
                onValueChange={(value) => setDocs(prev => prev.map((d, i) => i === index ? { ...d, documentType: value } : d))}
              >
                {docTypes.map((doc) => (
                  <Picker.Item key={doc.value} label={doc.label} value={doc.value} />
                ))}
              </Picker>
            </View>
            
            <Input
              placeholder="Document URL (optional if uploaded)"
              value={item.documentUrl}
              onChangeText={(v) => setDocs(prev => prev.map((d, i) => i === index ? { ...d, documentUrl: v } : d))}
              containerStyle={{ marginBottom: spacing.s }}
            />
            
            <Button
              title="Upload file"
              onPress={() => pickFile(index)}
              variant="outline"
            />
            
            {item.fileName && <Text variant="xs" color={colors.textSecondary} style={{ marginTop: 4 }}>Selected: {item.fileName}</Text>}
            
            {docs.length > 1 && (
              <TouchableOpacity onPress={() => removeRow(index)} style={{ alignSelf: 'flex-end', marginTop: spacing.s }}>
                <Text variant="s" color={colors.error} weight="bold">Remove</Text>
              </TouchableOpacity>
            )}
          </Card>
        )}
        ListFooterComponent={
          <View style={{ gap: spacing.m, marginTop: spacing.m }}>
            <Button
              title="+ Add another document"
              onPress={addRow}
              variant="secondary"
            />
            <Button
              title={submitMut.isPending ? 'Submitting...' : 'Submit for review'}
              onPress={() => {
                const payload = docs.filter(d => d.documentType && d.documentUrl);
                if (!selfie) {
                  toast.show('Please capture a selfie', 'error');
                  return;
                }
                if (!payload.length) {
                  toast.show('Add at least one document', 'error');
                  return;
                }
                submitMut.mutate([
                  ...payload,
                  { documentType: 'selfie', documentUrl: selfie.dataUrl, fileName: selfie.fileName }
                ]);
              }}
              loading={submitMut.isPending}
            />
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.m, gap: spacing.m },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: spacing.m, paddingVertical: spacing.xs, borderRadius: layout.borderRadius.round, marginTop: spacing.s },
  card: { marginTop: spacing.s },
  pickerWrap: { borderWidth: 1, borderColor: colors.border, borderRadius: layout.borderRadius.m, overflow: 'hidden', backgroundColor: colors.surface, marginBottom: spacing.s },
  selfieRow: { flexDirection: 'row', gap: spacing.s, marginTop: spacing.s },
  selfiePreview: { gap: spacing.s, marginTop: spacing.s },
  selfieThumb: { width: 96, height: 96, borderRadius: 8, alignSelf: 'flex-start' }
});
