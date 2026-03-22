import React, { useEffect, useState } from 'react';
import { verificationService } from '../../services/verificationService';
import { useAuthStore } from '../../store/useAuthStore';
import { ShieldCheck, Loader2, Plus, Trash2 } from 'lucide-react';

interface DocRow {
  documentType: string;
  documentUrl: string;
  fileName?: string;
}

const DEFAULT_DOCS: DocRow[] = [{ documentType: 'id_card', documentUrl: '' }];

const VendorVerification: React.FC = () => {
  const { user } = useAuthStore();
  const [docs, setDocs] = useState<DocRow[]>(DEFAULT_DOCS);
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isVendor = user?.role === 'vendor';

  useEffect(() => {
    if (!isVendor) return;
    fetchStatus();
  }, [isVendor]);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await verificationService.status();
      setStatus(res.verification);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load verification status');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await verificationService.submit(docs.filter(d => d.documentType && d.documentUrl));
      setSuccess('Documents submitted. We will review shortly.');
      await fetchStatus();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to submit verification');
    } finally {
      setSubmitting(false);
    }
  };

  const updateDoc = (idx: number, field: keyof DocRow, value: string) => {
    setDocs(prev => prev.map((d, i) => i === idx ? { ...d, [field]: value } : d));
  };

  const handleFileSelect = (idx: number, file: File | null) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('File too large. Max 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setDocs(prev => prev.map((d, i) => i === idx ? { ...d, documentUrl: result, fileName: file.name } : d));
    };
    reader.readAsDataURL(file);
  };

  const addRow = () => setDocs(prev => [...prev, { documentType: 'id_card', documentUrl: '' }]);
  const removeRow = (idx: number) => setDocs(prev => prev.filter((_, i) => i !== idx));

  if (!isVendor) {
    return <div className="p-8 text-center text-red-500">Verification is only for vendors.</div>;
  }

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>;
  }

  const badge = (() => {
    const st = status?.status || status?.verification?.status;
    if (st === 'verified') return { text: 'Verified', color: 'text-emerald-700 bg-emerald-100' };
    if (st === 'pending') return { text: 'Pending', color: 'text-amber-700 bg-amber-100' };
    if (st === 'rejected') return { text: 'Rejected', color: 'text-red-700 bg-red-100' };
    return { text: 'Unverified', color: 'text-gray-700 bg-gray-100' };
  })();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Vendor verification</p>
          <h1 className="text-2xl font-bold text-gray-900">Submit your documents</h1>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${badge.color}`}>
          {badge.text}
        </span>
      </div>

      {status?.rejectionReason && (
        <div className="p-3 rounded-md bg-red-50 text-red-700 border border-red-200 text-sm">
          Rejection reason: {status.rejectionReason}
        </div>
      )}

      {success && <div className="p-3 rounded-md bg-green-50 text-green-700 border border-green-200 text-sm">{success}</div>}
      {error && <div className="p-3 rounded-md bg-red-50 text-red-700 border border-red-200 text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 space-y-4">
        <div className="flex items-center gap-2 text-gray-700">
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
          <p className="font-semibold text-gray-900">Upload document</p>
        </div>
        <p className="text-sm text-gray-600">Provide documents (images/PDF). Accepted types: ID CARD, PASSPORT, CERTIFICATES, SELFIE.</p>

        <div className="space-y-3">
          {docs.map((doc, idx) => (
            <div key={idx} className="grid grid-cols-1 md:grid-cols-7 gap-3 items-center">
              <select
                value={doc.documentType}
                onChange={(e) => updateDoc(idx, 'documentType', e.target.value)}
                className="md:col-span-2 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="id_card">ID Card</option>
                <option value="passport">Passport</option>
                <option value="driver_license">Driver License</option>
                <option value="business_license">Business License</option>
                <option value="proof_of_address">Proof of Address</option>
                <option value="certificate">Certificate</option>
                <option value="selfie">Selfie</option>
                <option value="Other">Other</option>
              </select>
              <input
                type="url"
                placeholder="https://..."
                value={doc.documentUrl}
                onChange={(e) => updateDoc(idx, 'documentUrl', e.target.value)}
                className="md:col-span-2 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <div className="md:col-span-2 flex flex-col gap-2">
                <label className="inline-flex items-center justify-center px-3 py-2 text-sm rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => handleFileSelect(idx, e.target.files?.[0] || null)}
                  />
                  Upload file
                </label>
                {doc.fileName && <p className="text-xs text-gray-500 truncate">Selected: {doc.fileName}</p>}
              </div>
              <div className="md:col-span-1 flex justify-end">
                {docs.length > 1 && (
                  <button type="button" onClick={() => removeRow(idx)} className="p-2 text-red-600 hover:text-red-700">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center px-3 py-2 text-sm rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add another document
          </button>
          <div className="flex-1" />
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit for review'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default VendorVerification;
