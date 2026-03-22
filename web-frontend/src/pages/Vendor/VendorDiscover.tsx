import React, { useEffect, useMemo, useState } from 'react';
import { vendorService } from '../../services/vendorService';
import type { User, TaskCategory } from '../../types';
import { MapPin, ShieldCheck, ShieldAlert, Search, Star, Compass } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { Link } from 'react-router-dom';

const SKILL_OPTIONS: TaskCategory[] = [
  'laundry',
  'cleaning',
  'grocery-shopping',
  'plumbing',
  'electrical',
  'carpentry',
  'babysitting',
  'gardening',
  'petcare',
  'moving',
  'other'
];

const haversineKm = (coords1?: [number, number], coords2?: [number, number]) => {
  if (!coords1 || !coords2) return null;
  const [lon1, lat1] = coords1.map((c) => c * (Math.PI / 180));
  const [lon2, lat2] = coords2.map((c) => c * (Math.PI / 180));
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(6371 * c * 10) / 10; // km, 1 decimal
};

const VendorDiscover: React.FC = () => {
  const { user } = useAuthStore();
  const [vendors, setVendors] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1 });
  const [useGeo, setUseGeo] = useState<boolean>(!!user?.location?.coordinates?.length);
  const [coords, setCoords] = useState<[number, number] | undefined>(
    (user?.location?.coordinates as [number, number]) || undefined
  );

  const fetchVendors = async (page = 1, overrideCoords?: [number, number]) => {
    setLoading(true);
    try {
      const params: any = { page };
      if (category) params.category = category;
      if (useGeo && (overrideCoords || coords)) {
        const [lon, lat] = (overrideCoords || coords)!;
        params.latitude = lat;
        params.longitude = lon;
        params.maxDistance = 50; // km default radius
      }
      const data = await vendorService.getVerified(params);
      setVendors(data.vendors);
      setPagination({ currentPage: data.pagination.currentPage, totalPages: data.pagination.totalPages });
    } catch (error) {
      console.error('Failed to load vendors', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, useGeo]);

  const requestGeolocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation not supported in this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        setCoords(next);
        setUseGeo(true);
        fetchVendors(1, next);
      },
      () => alert('Unable to fetch your location.'),
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  const vendorCards = useMemo(() => {
    return vendors.map((vendor) => {
      const distanceKm = useGeo ? haversineKm(coords, vendor.location?.coordinates as [number, number]) : null;
      return (
        <div key={vendor._id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-900">{vendor.name}</h3>
                {vendor.vendorProfile?.isVerified ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                    <ShieldCheck className="h-4 w-4" /> Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                    <ShieldAlert className="h-4 w-4" /> Pending
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1">{vendor.vendorProfile?.description || 'No bio provided.'}</p>
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
                <Star className="h-4 w-4" />
                <span>{(vendor.vendorProfile?.rating?.average || 0).toFixed(1)}</span>
                <span className="text-xs text-gray-500">({vendor.vendorProfile?.rating?.count || 0})</span>
              </div>
              {distanceKm !== null && (
                <div className="mt-2 inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  <MapPin className="h-3 w-3" />
                  {distanceKm} km away
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4 text-blue-500" />
              <span>{vendor.location?.address || 'No address provided'}</span>
            </div>
            <Link to={`/vendors/${vendor._id}`} className="text-blue-600 font-semibold hover:text-blue-700">
              View profile
            </Link>
          </div>
        </div>
      );
    });
  }, [vendors, useGeo, coords]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-500">Vendor discovery</p>
          <h1 className="text-2xl font-bold text-gray-900">Nearby & verified vendors</h1>
          <p className="text-gray-600">Filter by skill and prioritize verified vendors around you.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setUseGeo(!useGeo)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-md border text-sm font-medium ${
              useGeo ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-700'
            }`}
          >
            <Compass className="h-4 w-4" />
            {useGeo ? 'Using location' : 'Use location'}
          </button>
          {!user?.location?.coordinates?.length && (
            <button
              onClick={requestGeolocation}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gray-200 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <MapPin className="h-4 w-4" />
              Fetch GPS
            </button>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-gray-400" />
          <div>
            <p className="text-sm font-semibold text-gray-900">Filter by skill</p>
            <p className="text-xs text-gray-500">Match vendors by what you need</p>
          </div>
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full md:w-60 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All skills</option>
          {SKILL_OPTIONS.map((skill) => (
            <option key={skill} value={skill} className="capitalize">
              {skill.replace('-', ' ')}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-500">Loading vendors...</div>
      ) : vendors.length === 0 ? (
        <div className="py-16 text-center bg-white border border-dashed border-gray-300 rounded-xl">
          <p className="text-gray-600">No vendors found for this filter.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {vendorCards}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button
          disabled={pagination.currentPage <= 1}
          onClick={() => fetchVendors(pagination.currentPage - 1)}
          className="px-3 py-2 text-sm rounded-md border border-gray-200 disabled:opacity-50"
        >
          Prev
        </button>
        <span className="text-sm text-gray-600 self-center">
          Page {pagination.currentPage} / {pagination.totalPages}
        </span>
        <button
          disabled={pagination.currentPage >= pagination.totalPages}
          onClick={() => fetchVendors(pagination.currentPage + 1)}
          className="px-3 py-2 text-sm rounded-md border border-gray-200 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default VendorDiscover;
