import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Linking, Modal } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskApi } from '../../api/tasks';
import { useAuthStore } from '../../store/useAuthStore';
import { disputeApi } from '../../api/disputes';
import { paymentApi } from '../../api/payments';
import { ratingApi } from '../../api/ratings';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import { useToast } from '../../components/Toast/ToastProvider';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { colors } from '../../theme/colors';
import { spacing, layout } from '../../theme/spacing';

export default function TaskDetailsScreen() {
  const { params } = useRoute<any>();
  const nav = useNavigation<any>();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const toast = useToast();
  
  const { data: task, isLoading, isError, error } = useQuery({
    queryKey: ['task', params?.id],
    queryFn: () => taskApi.get(params.id),
  });

  const [showDispute, setShowDispute] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [ratingTarget, setRatingTarget] = useState<'vendor' | 'employer'>('vendor');
  const [ratingValue, setRatingValue] = useState('5');
  const [ratingComment, setRatingComment] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'cash'>('mpesa');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [cashNotes, setCashNotes] = useState('');
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [disputeForm, setDisputeForm] = useState({
    title: '',
    type: 'service_not_provided',
    description: '',
    evidence: '',
  });
  const [evidenceImages, setEvidenceImages] = useState<Array<{ name: string; dataUrl: string }>>([]);
  const [budgetDraft, setBudgetDraft] = useState('');

  const updateStatus = useMutation({
    mutationFn: (status: string) => taskApi.updateStatus(params.id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task', params.id] }),
  });

  const assignSelf = useMutation({
    mutationFn: () => taskApi.assignSelf(params.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task', params.id] }),
  });

  const createDispute = useMutation({
    mutationFn: disputeApi.create,
    onSuccess: async () => {
      await taskApi.updateStatus(params.id, 'disputed');
      qc.invalidateQueries({ queryKey: ['task', params.id] });
      setShowDispute(false);
      setDisputeForm({ title: '', type: 'service_not_provided', description: '', evidence: '' });
      setEvidenceImages([]);
      toast.show('Dispute submitted', 'info');
    },
    onError: () => toast.show('Dispute failed', 'error')
  });

  const initiateMpesa = useMutation({
    mutationFn: (payload: { taskId: string; phone: string }) => paymentApi.initiateMpesa(payload.taskId, payload.phone),
    onSuccess: () => {
      toast.show('STK push sent', 'success');
      qc.invalidateQueries({ queryKey: ['task', params.id] });
      setShowPayment(false);
      setPhoneNumber('');
    },
    onError: () => toast.show('Payment failed', 'error')
  });

  const createCash = useMutation({
    mutationFn: (payload: { taskId: string; amount: number; notes?: string }) => paymentApi.createCashRecord(payload.taskId, payload.amount, payload.notes),
    onSuccess: () => {
      toast.show('Cash recorded', 'success');
      qc.invalidateQueries({ queryKey: ['task', params.id] });
      setShowPayment(false);
      setCashNotes('');
    },
    onError: () => toast.show('Cash record failed', 'error')
  });

  const submitRating = useMutation({
    mutationFn: (payload: { rating: number; comment?: string; rateeRole: 'vendor' | 'employer' }) =>
      ratingApi.rate(params.id, payload),
    onSuccess: () => {
      toast.show('Rating submitted', 'success');
      setShowRating(false);
      setRatingComment('');
      qc.invalidateQueries({ queryKey: ['task', params.id] });
      qc.invalidateQueries({ queryKey: ['rating-summary'] });
    },
    onError: () => toast.show('Rating failed', 'error')
  });

  const updateBudget = useMutation({
    mutationFn: (budget: number) => taskApi.updateBudget(params.id, budget),
    onSuccess: (updated) => {
      toast.show('Budget updated', 'success');
      qc.invalidateQueries({ queryKey: ['task', params.id] });
      if (updated?.budget !== undefined) {
        setBudgetDraft(String(updated.budget));
      }
    },
    onError: (err: any) => toast.show(err?.response?.data?.message || 'Failed to update budget', 'error')
  });

  const repostTask = useMutation({
    mutationFn: () => taskApi.create({
      title: task.title,
      description: task.description,
      category: task.category,
      budget: task.budget,
      location: task.location?.address ? {
        address: task.location.address,
        coordinates: task.location.coordinates
      } : undefined,
      urgency: task.urgency,
      estimatedHours: task.estimatedHours
    }),
    onSuccess: (newTask) => {
      toast.show('Task reposted', 'success');
      const newId = newTask?._id || newTask?.id;
      if (newId) nav.navigate('TaskDetails', { id: newId });
    },
    onError: () => toast.show('Failed to repost task', 'error')
  });

  useEffect(() => {
    if (!task?.completionExpiresAt || task.status !== 'completion-requested') {
      setTimeLeft(null);
      return;
    }
    const interval = setInterval(() => {
      const diff = new Date(task.completionExpiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('Auto-approving...');
        clearInterval(interval);
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${minutes}m ${seconds}s`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [task?.completionExpiresAt, task?.status]);

  useEffect(() => {
    if (task?.budget !== undefined) {
      setBudgetDraft(String(task.budget));
    }
  }, [task?.budget]);

  const pickEvidenceImages = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*'],
      copyToCacheDirectory: true,
      multiple: true
    });
    if (result.canceled) return;
    const files = result.assets || [];
    if (!files.length) {
      toast.show('No image selected', 'error');
      return;
    }
    const nextImages: Array<{ name: string; dataUrl: string }> = [];
    for (const file of files) {
      if (!file?.uri) continue;
      if (file.size && file.size > 5 * 1024 * 1024) {
        toast.show(`Skipped ${file.name || 'image'} (max 5MB)`, 'error');
        continue;
      }
      try {
        let uriToRead = file.uri;
        try {
          const info = await FileSystem.getInfoAsync(uriToRead);
          if (!info.exists) throw new Error('File not accessible');
        } catch {
          const safeName = file.name || `evidence_${Date.now()}.jpg`;
          const dest = `${FileSystem.cacheDirectory}${safeName}`;
          await FileSystem.copyAsync({ from: file.uri, to: dest });
          uriToRead = dest;
        }
        const base64 = await FileSystem.readAsStringAsync(uriToRead, { encoding: FileSystem.EncodingType.Base64 });
        const mime = file.mimeType || 'image/jpeg';
        nextImages.push({ name: file.name || 'evidence-image', dataUrl: `data:${mime};base64,${base64}` });
      } catch (err: any) {
        toast.show(err?.message || 'Could not read image', 'error');
      }
    }
    if (nextImages.length) {
      setEvidenceImages((prev) => [...prev, ...nextImages]);
      toast.show(`${nextImages.length} image(s) attached`, 'success');
    }
  };

  if (isLoading || !task) return <Screen><View style={styles.center}><Text>Loading task...</Text></View></Screen>;
  if (isError) return <Screen><View style={styles.center}><Text color={colors.error}>{(error as any)?.message || 'Failed to load task.'}</Text></View></Screen>;

  const isVendorVerified = user?.role === 'vendor' ? user.vendorProfile?.isVerified : false;
  const canAccept = user?.role === 'vendor' && isVendorVerified && task.status === 'open';
  const canStart = task.status === 'assigned' && task.assignedVendor?._id === user?._id;
  const canRequestCompletion = ['assigned', 'in-progress'].includes(task.status) && task.assignedVendor?._id === user?._id;
  const canRaiseDispute = user?.role === 'employer' && task.assignedVendor;
  const canPay = user?.role === 'employer' && task.status === 'completed' && task.paymentStatus !== 'paid';
  const isVendorPaid = user?.role === 'vendor' && ['paid', 'completed', 'confirmed'].includes(task.paymentStatus || '');
  const hasRated = task.ratings?.some((r: any) => (typeof r.ratedBy === 'object' ? r.ratedBy._id : r.ratedBy) === user?._id);
  const canRateVendor = user?.role === 'employer' && task.status === 'completed' && !hasRated;
  const canRateEmployer = user?.role === 'vendor' && task.status === 'completed' && !hasRated;
  const canEditBudget = user?.role === 'employer' && task.status === 'open' && !task.assignedVendor;
  const canRepost = user?.role === 'employer' && task.status === 'completed';

  const coords = task.location?.coordinates;
  const mapRegion = coords
    ? { latitude: coords[1], longitude: coords[0], latitudeDelta: 0.01, longitudeDelta: 0.01 }
    : null;
  const statusSteps = ['open', 'assigned', 'in-progress', 'completion-requested', 'completed', 'disputed', 'cancelled'];
  const activeIndex = statusSteps.indexOf(task.status);

  return (
    <Screen scroll>
      <View style={styles.container}>
        <View>
          <Text variant="xl" weight="bold">{task.title}</Text>
          <Text variant="s" color={colors.textSecondary} style={{ marginTop: 4 }}>
            {task.category} • <Text weight="bold" color={colors.primary}>{task.status.replace('-', ' ')}</Text>
          </Text>
        </View>

        <Card>
          <Text variant="s" weight="bold" style={{ marginBottom: 4 }}>Location</Text>
          <Text variant="m" style={{ marginBottom: 8 }}>{task.location?.address || 'No location provided'}</Text>
          {mapRegion ? (
            <View style={styles.mapContainer}>
              <MapView style={StyleSheet.absoluteFill} region={mapRegion}>
                <UrlTile urlTemplate="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maximumZ={19} />
                <Marker coordinate={{ latitude: mapRegion.latitude, longitude: mapRegion.longitude }} />
              </MapView>
            </View>
          ) : (
            <Text variant="s" color={colors.textLight}>No coordinates available.</Text>
          )}
        </Card>

        {(user?.role === 'employer' || (user?.role === 'vendor' && isVendorVerified)) && (
          <Card>
            <Text variant="s" weight="bold" style={{ marginBottom: 4 }}>Employer</Text>
            <Text variant="m">{task.employer?.name || 'Unknown'}</Text>
            <Text variant="s" color={colors.textSecondary}>{task.employer?.phone || 'No phone provided'}</Text>
            {task.employer?.phone && (
              <Button
                title="Call employer"
                variant="outline"
                onPress={() => Linking.openURL(`tel:${task.employer.phone}`)}
                style={{ marginTop: spacing.s }}
              />
            )}
          </Card>
        )}

        <Card>
          <Text variant="s" weight="bold" style={{ marginBottom: 4 }}>Budget</Text>
          <Text variant="xl" weight="heavy" color={colors.primary}>KES {task.budget?.toLocaleString?.() || task.budget}</Text>
          {task.paymentStatus && <Text variant="xs" weight="bold" color={colors.success} style={{ textTransform: 'uppercase', marginTop: 2 }}>Payment: {task.paymentStatus}</Text>}
          
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text variant="xs" weight="bold" color={colors.textSecondary}>Urgency</Text>
              <Text variant="s">{task.urgency || 'N/A'}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text variant="xs" weight="bold" color={colors.textSecondary}>Est. Hours</Text>
              <Text variant="s">{task.estimatedHours ?? 'N/A'}</Text>
            </View>
          </View>
        </Card>

        {canEditBudget && (
          <Card>
            <Text variant="s" weight="bold" style={{ marginBottom: spacing.s }}>Update budget</Text>
            <View style={{ flexDirection: 'row', gap: spacing.s, alignItems: 'flex-end' }}>
              <Input
                placeholder="New budget"
                keyboardType="numeric"
                value={budgetDraft}
                onChangeText={setBudgetDraft}
                containerStyle={{ flex: 1, marginBottom: 0 }}
              />
              <Button
                title="Save"
                onPress={() => {
                  const val = Number(budgetDraft);
                  if (!val || val <= 0) {
                    toast.show('Enter a valid budget', 'error');
                    return;
                  }
                  updateBudget.mutate(val);
                }}
                loading={updateBudget.isPending}
                style={{ minWidth: 80 }}
              />
            </View>
          </Card>
        )}

        {user?.role === 'employer' && task.assignedVendor && (
          <Card>
            <Text variant="s" weight="bold" style={{ marginBottom: 4 }}>Assigned vendor</Text>
            <Text variant="m">{task.assignedVendor?.name || 'Unknown'}</Text>
            <Text variant="s" color={colors.textSecondary}>{task.assignedVendor?.phone || 'No phone provided'}</Text>
            <Text variant="s" color={colors.textSecondary}>
              Rating: {task.assignedVendor?.vendorProfile?.rating?.average?.toFixed?.(1) || '0.0'}
            </Text>
            {task.assignedVendor?.phone && (
              <Button
                title="Call vendor"
                variant="outline"
                onPress={() => Linking.openURL(`tel:${task.assignedVendor.phone}`)}
                style={{ marginTop: spacing.s }}
              />
            )}
          </Card>
        )}

        <Card>
          <Text variant="s" weight="bold" style={{ marginBottom: spacing.s }}>Status timeline</Text>
          <View style={styles.timeline}>
            {statusSteps.map((step, idx) => (
              <View key={step} style={styles.timelineRow}>
                <View style={[styles.timelineDot, idx <= activeIndex && styles.timelineDotActive]} />
                <Text variant="xs" color={idx <= activeIndex ? colors.primary : colors.textLight} weight={idx <= activeIndex ? 'bold' : 'regular'}>
                  {step.replace('-', ' ')}
                </Text>
              </View>
            ))}
          </View>
        </Card>

        {isVendorPaid && (
          <Card variant="flat" style={{ backgroundColor: '#ecfdf3', borderColor: '#bbf7d0', borderWidth: 1 }}>
            <Text variant="s" weight="bold" color="#166534">Payment released</Text>
            <Text variant="s" color="#166534">Your payout has been released for this task.</Text>
          </Card>
        )}

        {task.status === 'completion-requested' && (
          <Card variant="flat" style={{ backgroundColor: '#fff7ed', borderColor: '#fed7aa', borderWidth: 1 }}>
            <Text variant="s" weight="bold" color="#9a3412">Completion requested</Text>
            <Text variant="s" color="#9a3412">Client has 1 hour to approve or dispute.</Text>
            {timeLeft && <Text variant="s" color="#9a3412">Time left: {timeLeft}</Text>}
          </Card>
        )}

        <Text variant="m" style={{ lineHeight: 24 }}>{task.description}</Text>

        <View style={styles.actions}>
          {canAccept && <Button title="Accept task" onPress={() => assignSelf.mutate()} loading={assignSelf.isPending} />}
          
          {user?.role === 'vendor' && !isVendorVerified && task.status === 'open' && (
             <Card variant="flat" style={{ backgroundColor: '#fff7ed' }}>
               <Text variant="s" color="#9a3412">You must be verified to accept tasks.</Text>
             </Card>
          )}

          {canStart && <Button title="Start work" onPress={() => updateStatus.mutate('in-progress')} loading={updateStatus.isPending} />}
          
          {canRequestCompletion && <Button title="Request completion" onPress={() => updateStatus.mutate('completion-requested')} loading={updateStatus.isPending} />}
          
          {task.status === 'completion-requested' && user?.role === 'employer' && (
            <>
              <Button title="Approve completion" onPress={() => updateStatus.mutate('completed')} />
              <Button title="Dispute" variant="secondary" onPress={() => setShowDispute(true)} />
            </>
          )}

          {!canRequestCompletion && canRaiseDispute && (
            <Button title="Raise dispute" variant="secondary" onPress={() => setShowDispute(true)} />
          )}

          {canPay && (
            <>
              <Button title="Pay via M-Pesa" onPress={() => { setPaymentMethod('mpesa'); setShowPayment(true); }} />
              <Button title="Record Cash Payment" variant="outline" onPress={() => { setPaymentMethod('cash'); setShowPayment(true); }} />
            </>
          )}

          {canRepost && (
            <Button title={repostTask.isPending ? 'Reposting...' : 'Repost Task'} onPress={() => repostTask.mutate()} loading={repostTask.isPending} />
          )}

          {canRateVendor && (
            <Button title="Rate Vendor" onPress={() => { setRatingTarget('vendor'); setShowRating(true); }} />
          )}

          {canRateEmployer && (
            <Button title="Rate Employer" onPress={() => { setRatingTarget('employer'); setShowRating(true); }} />
          )}
        </View>

        {/* Modals */}
        <Modal visible={showDispute} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <Card style={styles.modalCard}>
              <Text variant="l" weight="bold" style={{ marginBottom: spacing.m }}>Raise a dispute</Text>
              <Input placeholder="Title" value={disputeForm.title} onChangeText={(v) => setDisputeForm({ ...disputeForm, title: v })} />
              <Input placeholder="Type (e.g., service_not_provided)" value={disputeForm.type} onChangeText={(v) => setDisputeForm({ ...disputeForm, type: v })} />
              <Input placeholder="Description" multiline style={{ height: 100, textAlignVertical: 'top' }} value={disputeForm.description} onChangeText={(v) => setDisputeForm({ ...disputeForm, description: v })} />
              <Input placeholder="Evidence links (comma separated)" value={disputeForm.evidence} onChangeText={(v) => setDisputeForm({ ...disputeForm, evidence: v })} />
              
              <Button title="Attach evidence images" variant="outline" onPress={pickEvidenceImages} style={{ marginBottom: spacing.s }} />
              {evidenceImages.length > 0 && <Text variant="xs" color={colors.textSecondary} style={{ marginBottom: spacing.s }}>Attached: {evidenceImages.map((e) => e.name).join(', ')}</Text>}
              
              <View style={styles.modalActions}>
                <Button title="Cancel" variant="text" onPress={() => setShowDispute(false)} style={{ flex: 1 }} />
                <Button 
                  title="Submit" 
                  style={{ flex: 1 }}
                  loading={createDispute.isPending}
                  onPress={() => {
                    if (!disputeForm.title || !disputeForm.description) {
                      toast.show('Title and description are required', 'error');
                      return;
                    }
                    const evidenceLinks = disputeForm.evidence ? disputeForm.evidence.split(',').map((s) => s.trim()).filter(Boolean) : [];
                    const evidencePayload: Array<string | { type: string; url: string; description?: string }> = [...evidenceLinks];
                    evidenceImages.forEach((img) => evidencePayload.push({ type: 'image', url: img.dataUrl, description: img.name }));
                    createDispute.mutate({
                      taskId: params.id,
                      title: disputeForm.title,
                      type: disputeForm.type,
                      description: disputeForm.description,
                      evidence: evidencePayload.length ? evidencePayload : undefined,
                    });
                  }} 
                />
              </View>
            </Card>
          </View>
        </Modal>

        <Modal visible={showPayment} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <Card style={styles.modalCard}>
              <Text variant="l" weight="bold" style={{ marginBottom: spacing.m }}>{paymentMethod === 'mpesa' ? 'Pay via M-Pesa' : 'Record cash payment'}</Text>
              {paymentMethod === 'mpesa' ? (
                <>
                  <Input placeholder="Phone number (e.g., 2547...)" keyboardType="phone-pad" value={phoneNumber} onChangeText={setPhoneNumber} />
                  <View style={styles.modalActions}>
                    <Button title="Cancel" variant="text" onPress={() => setShowPayment(false)} style={{ flex: 1 }} />
                    <Button 
                      title="Send STK Push" 
                      style={{ flex: 1 }}
                      loading={initiateMpesa.isPending}
                      onPress={() => {
                        if (!phoneNumber) { toast.show('Enter phone number', 'error'); return; }
                        initiateMpesa.mutate({ taskId: params.id, phone: phoneNumber });
                      }} 
                    />
                  </View>
                </>
              ) : (
                <>
                  <Input placeholder="Cash notes (optional)" value={cashNotes} onChangeText={setCashNotes} />
                  <View style={styles.modalActions}>
                    <Button title="Cancel" variant="text" onPress={() => setShowPayment(false)} style={{ flex: 1 }} />
                    <Button 
                      title="Record cash" 
                      style={{ flex: 1 }}
                      loading={createCash.isPending}
                      onPress={() => createCash.mutate({ taskId: params.id, amount: task.budget, notes: cashNotes || undefined })} 
                    />
                  </View>
                </>
              )}
            </Card>
          </View>
        </Modal>

        <Modal visible={showRating} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <Card style={styles.modalCard}>
              <Text variant="l" weight="bold" style={{ marginBottom: spacing.m }}>Rate {ratingTarget}</Text>
              <Input placeholder="Rating (1-10)" keyboardType="numeric" value={ratingValue} onChangeText={setRatingValue} />
              <Input placeholder="Comment (optional)" multiline style={{ height: 80, textAlignVertical: 'top' }} value={ratingComment} onChangeText={setRatingComment} />
              
              <View style={styles.modalActions}>
                <Button title="Cancel" variant="text" onPress={() => setShowRating(false)} style={{ flex: 1 }} />
                <Button 
                  title="Submit" 
                  style={{ flex: 1 }}
                  loading={submitRating.isPending}
                  onPress={() => {
                    const val = Number(ratingValue);
                    if (!val || val < 1 || val > 10) { toast.show('Rating must be between 1 and 10', 'error'); return; }
                    submitRating.mutate({ rating: val, comment: ratingComment || undefined, rateeRole: ratingTarget });
                  }} 
                />
              </View>
            </Card>
          </View>
        </Modal>

      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.m,
    gap: spacing.m,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  mapContainer: {
    height: 180,
    borderRadius: layout.borderRadius.m,
    overflow: 'hidden',
    marginTop: spacing.s,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.l,
    marginTop: spacing.s,
  },
  metaItem: {
    flex: 1,
  },
  timeline: {
    gap: spacing.s,
    marginTop: spacing.xs,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  timelineDotActive: {
    backgroundColor: colors.primary,
  },
  actions: {
    gap: spacing.s,
    marginTop: spacing.s,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.m,
  },
  modalCard: {
    maxHeight: '80%',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.m,
    marginTop: spacing.s,
  },
});
