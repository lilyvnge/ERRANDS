import React, { useMemo, useState } from 'react';
import { MapPin, Crosshair, Loader2 } from 'lucide-react';

interface LocationValue {
  address: string;
  coordinates: [number, number]; // [lng, lat]
}

interface LocationPickerProps {
  value: LocationValue;
  onChange: (val: LocationValue) => void;
}

const LocationPicker: React.FC<LocationPickerProps> = ({ value, onChange }) => {
  const [locLoading, setLocLoading] = useState(false);

  const updateField = (field: 'address' | 'coordinates', val: any) => {
    if (field === 'address') {
      onChange({ ...value, address: val });
    } else {
      onChange({ ...value, coordinates: val });
    }
  };

  const mapSrc = useMemo(() => {
    const [lng, lat] = value.coordinates;
    const delta = 0.01;
    const bbox = `${lng - delta}%2C${lat - delta}%2C${lng + delta}%2C${lat + delta}`;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;
  }, [value.coordinates]);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation not supported by your browser.');
      return;
    }
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        updateField('coordinates', next);
        setLocLoading(false);
      },
      () => {
        alert('Could not fetch location. Please allow location access or set manually.');
        setLocLoading(false);
      },
      { enableHighAccuracy: true, timeout: 7000 }
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-blue-500" />
          <p className="text-sm font-semibold text-gray-800">Location</p>
        </div>
        <button
          type="button"
          onClick={useMyLocation}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md border border-gray-200 text-gray-700 bg-white hover:bg-gray-50"
        >
          {locLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
          Use my location
        </button>
      </div>

      <label className="block text-sm font-medium text-gray-700">Address</label>
      <input
        type="text"
        value={value.address}
        onChange={(e) => updateField('address', e.target.value)}
        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
        placeholder="e.g., Westlands, Nairobi"
        required
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">Latitude</label>
          <input
            type="number"
            step="0.000001"
            value={value.coordinates[1]}
            onChange={(e) => {
              const lat = parseFloat(e.target.value);
              if (!Number.isNaN(lat)) updateField('coordinates', [value.coordinates[0], lat]);
            }}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Longitude</label>
          <input
            type="number"
            step="0.000001"
            value={value.coordinates[0]}
            onChange={(e) => {
              const lng = parseFloat(e.target.value);
              if (!Number.isNaN(lng)) updateField('coordinates', [lng, value.coordinates[1]]);
            }}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 h-64">
        <iframe
          title="Location Map"
          src={mapSrc}
          className="w-full h-full border-0"
          loading="lazy"
        />
      </div>
    </div>
  );
};

export default LocationPicker;
