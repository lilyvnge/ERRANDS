import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { vendorService } from '../../services/vendorService';
import type { User } from '../../types';
import { ShieldCheck, ShieldAlert, MapPin, Star, Mail, Phone, BadgeInfo } from 'lucide-react';

const VendorProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [vendor, setVendor] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const data = await vendorService.getVendorProfile(id);
        setVendor(data.vendor);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load vendor profile');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return <div className="p-10 text-center text-gray-500">Loading vendor...</div>;
  if (error) return <div className="p-10 text-center text-red-600">{error}</div>;
  if (!vendor) return <div className="p-10 text-center text-gray-500">Vendor not found.</div>;

  const rating = vendor.vendorProfile?.rating;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{vendor.name}</h1>
              {vendor.vendorProfile?.isVerified ? (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                  <ShieldCheck className="h-4 w-4" />
                  Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                  <ShieldAlert className="h-4 w-4" />
                  Verification pending
                </span>
              )}
            </div>
            <p className="text-gray-600 mt-1">{vendor.vendorProfile?.description || 'No bio provided.'}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {(vendor.vendorProfile?.skills || []).map((skill) => (
                <span key={skill} className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold capitalize">
                  {skill.replace('-', ' ')}
                </span>
              ))}
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-1 text-amber-500 font-semibold">
              <Star className="h-5 w-5" />
              <span className="text-lg">{(rating?.average || 0).toFixed(1)}</span>
              <span className="text-xs text-gray-500">({rating?.count || 0} reviews)</span>
            </div>
            {vendor.vendorProfile?.hourlyRate && (
              <p className="text-sm text-gray-600 mt-2">Hourly rate: KES {vendor.vendorProfile.hourlyRate}</p>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="flex items-center gap-3 text-gray-700">
            <Mail className="h-5 w-5 text-gray-500" />
            <span className="text-sm">{vendor.email}</span>
          </div>
          <div className="flex items-center gap-3 text-gray-700">
            <Phone className="h-5 w-5 text-gray-500" />
            <span className="text-sm">{vendor.phone || 'Phone not provided'}</span>
          </div>
          <div className="flex items-center gap-3 text-gray-700">
            <MapPin className="h-5 w-5 text-gray-500" />
            <span className="text-sm">{vendor.location?.address || 'Location not provided'}</span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-3">
          <BadgeInfo className="h-5 w-5 text-blue-500" />
          <h2 className="text-lg font-semibold text-gray-900">Verification & rating</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="p-4 border border-gray-100 rounded-lg">
            <p className="text-sm text-gray-500">Verification status</p>
            <p className="text-base font-semibold text-gray-900 mt-1 capitalize">
              {vendor.vendorProfile?.verification?.status || 'unverified'}
            </p>
            {vendor.vendorProfile?.verification?.rejectionReason && (
              <p className="text-xs text-red-600 mt-1">{vendor.vendorProfile.verification.rejectionReason}</p>
            )}
          </div>
          <div className="p-4 border border-gray-100 rounded-lg">
            <p className="text-sm text-gray-500">Rating breakdown</p>
            <p className="text-base font-semibold text-gray-900 mt-1">
              {(rating?.average || 0).toFixed(1)} average • {rating?.count || 0} reviews
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorProfile;
