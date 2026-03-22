import React from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { ShieldCheck, ShieldAlert, MapPin, Phone, Mail, User, Star } from 'lucide-react';

const UserProfile: React.FC = () => {
  const { user } = useAuthStore();

  if (!user) {
    return <div className="p-8 text-center text-gray-600">Loading profile...</div>;
  }

  const isVendor = user.role === 'vendor';
  const vendorProfile = user.vendorProfile;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-500">Account</p>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            {user.name}
            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 capitalize">
              {user.role}
            </span>
            {isVendor && vendorProfile?.isVerified && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                <ShieldCheck className="h-4 w-4" /> Verified
              </span>
            )}
            {isVendor && vendorProfile && !vendorProfile.isVerified && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                <ShieldAlert className="h-4 w-4" /> Verification pending
              </span>
            )}
          </h1>
          <p className="text-gray-600">Manage your profile, contact info, and vendor credentials.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 text-gray-500">
            <Mail className="h-5 w-5" />
            <p className="text-sm font-semibold text-gray-700">Email</p>
          </div>
          <p className="mt-2 text-lg font-medium text-gray-900 break-all">{user.email}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 text-gray-500">
            <Phone className="h-5 w-5" />
            <p className="text-sm font-semibold text-gray-700">Phone</p>
          </div>
          <p className="mt-2 text-lg font-medium text-gray-900">{user.phone || 'Not added'}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 text-gray-500">
            <User className="h-5 w-5" />
            <p className="text-sm font-semibold text-gray-700">Member since</p>
          </div>
          <p className="mt-2 text-lg font-medium text-gray-900">
            {new Date(user.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Location</h2>
            <p className="text-sm text-gray-500">Update your service or delivery area</p>
          </div>
        </div>
        <div className="px-6 py-5">
          {user.location ? (
            <div className="flex items-start gap-3 text-gray-800">
              <MapPin className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium">{user.location.address}</p>
                <p className="text-sm text-gray-500">Lon/Lat: {user.location.coordinates.join(', ')}</p>
              </div>
            </div>
          ) : (
            <p className="text-gray-600">No location on file.</p>
          )}
        </div>
      </div>

      {isVendor && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Vendor Profile</h2>
              <p className="text-sm text-gray-500">Skills, verification, and rating overview</p>
            </div>
          </div>
          <div className="px-6 py-5 grid gap-5 md:grid-cols-3">
            <div className="p-4 border border-gray-100 rounded-lg">
              <p className="text-sm text-gray-500">Verification</p>
              <div className="mt-2 flex items-center gap-2">
                {vendorProfile?.isVerified ? (
                  <>
                    <ShieldCheck className="h-5 w-5 text-emerald-600" />
                    <span className="text-emerald-700 font-semibold">Verified</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="h-5 w-5 text-amber-500" />
                    <span className="text-amber-700 font-semibold">
                      {vendorProfile?.verification?.status || 'Unverified'}
                    </span>
                  </>
                )}
              </div>
              {vendorProfile?.verification?.rejectionReason && (
                <p className="mt-2 text-xs text-red-600">{vendorProfile.verification.rejectionReason}</p>
              )}
            </div>

            <div className="p-4 border border-gray-100 rounded-lg">
              <p className="text-sm text-gray-500">Skills</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(vendorProfile?.skills || []).length === 0 ? (
                  <span className="text-gray-500 text-sm">No skills added yet</span>
                ) : (
                  vendorProfile!.skills.map((skill) => (
                    <span key={skill} className="px-2 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700 capitalize">
                      {skill.replace('-', ' ')}
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className="p-4 border border-gray-100 rounded-lg">
              <p className="text-sm text-gray-500">Rating</p>
              <div className="mt-2 flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-500" />
                <span className="text-lg font-semibold text-gray-900">
                  {vendorProfile?.rating?.average?.toFixed(1) || 'N/A'}
                </span>
                <span className="text-sm text-gray-500">
                  ({vendorProfile?.rating?.count || 0} reviews)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
