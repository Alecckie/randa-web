import { useState, useEffect } from 'react';

interface County {
  id: number;
  name: string;
}

interface Subcounty {
  id: number;
  name: string;
}

interface Ward {
  id: number;
  name: string;
}

interface LocationChangePayload {
  county_id: number | null;
  subcounty_id: number | null;
  ward_id: number | null;
}

interface LocationSelectorProps {
  onLocationChange: (location: LocationChangePayload) => void;
}

interface LoadingState {
  counties?: boolean;
  subcounties?: boolean;
  wards?: boolean;
}

const LocationSelector: React.FC<LocationSelectorProps> = ({ onLocationChange }) => {
  const [counties, setCounties] = useState<County[]>([]);
  const [subcounties, setSubcounties] = useState<Subcounty[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);

  const [selectedCounty, setSelectedCounty] = useState<string>('');
  const [selectedSubcounty, setSelectedSubcounty] = useState<string>('');
  const [selectedWard, setSelectedWard] = useState<string>('');

  const [loading, setLoading] = useState<LoadingState>({});

  // Load counties on mount
  useEffect(() => {
    loadCounties();
  }, []);

  const loadCounties = async () => {
    setLoading(prev => ({ ...prev, counties: true }));
    try {
      const response = await fetch('/locations/counties', {
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      });
      const data: County[] = await response.json();
      setCounties(data);
    } catch (error) {
      console.error('Failed to load counties:', error);
    }
    setLoading(prev => ({ ...prev, counties: false }));
  };

  const loadSubcounties = async (countyId: string) => {
    if (!countyId) return;

    setLoading(prev => ({ ...prev, subcounties: true }));
    setSubcounties([]);
    setWards([]);
    setSelectedSubcounty('');
    setSelectedWard('');

    try {
      const response = await fetch(`/locations/counties/${countyId}/subcounties`, {
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      });
      const data: Subcounty[] = await response.json();
      setSubcounties(data);
    } catch (error) {
      console.error('Failed to load subcounties:', error);
    }
    setLoading(prev => ({ ...prev, subcounties: false }));
  };

  const loadWards = async (subcountyId: string) => {
    if (!subcountyId) return;

    setLoading(prev => ({ ...prev, wards: true }));
    setWards([]);
    setSelectedWard('');

    try {
      const response = await fetch(`/locations/subcounties/${subcountyId}/wards`, {
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      });
      const data: Ward[] = await response.json();
      setWards(data);
    } catch (error) {
      console.error('Failed to load wards:', error);
    }
    setLoading(prev => ({ ...prev, wards: false }));
  };

  const handleCountyChange = (countyId: string) => {
    setSelectedCounty(countyId);
    loadSubcounties(countyId);
    onLocationChange({ county_id: countyId ? Number(countyId) : null, subcounty_id: null, ward_id: null });
  };

  const handleSubcountyChange = (subcountyId: string) => {
    setSelectedSubcounty(subcountyId);
    loadWards(subcountyId);
    onLocationChange({ county_id: selectedCounty ? Number(selectedCounty) : null, subcounty_id: subcountyId ? Number(subcountyId) : null, ward_id: null });
  };

  const handleWardChange = (wardId: string) => {
    setSelectedWard(wardId);
    onLocationChange({ county_id: selectedCounty ? Number(selectedCounty) : null, subcounty_id: selectedSubcounty ? Number(selectedSubcounty) : null, ward_id: wardId ? Number(wardId) : null });
  };

  return (
    <div className="space-y-4">
      {/* County Dropdown */}
      <div>
        <label className="block text-sm font-medium mb-1">County</label>
        <select
          value={selectedCounty}
          onChange={(e) => handleCountyChange(e.target.value)}
          className="w-full border rounded-md px-3 py-2"
          disabled={loading.counties}
        >
          <option value="">
            {loading.counties ? 'Loading counties...' : 'Select County'}
          </option>
          {counties.map((county) => (
            <option key={county.id} value={county.id}>
              {county.name}
            </option>
          ))}
        </select>
      </div>

      {/* Subcounty Dropdown */}
      <div>
        <label className="block text-sm font-medium mb-1">Subcounty</label>
        <select
          value={selectedSubcounty}
          onChange={(e) => handleSubcountyChange(e.target.value)}
          className="w-full border rounded-md px-3 py-2"
          disabled={!selectedCounty || loading.subcounties}
        >
          <option value="">
            {loading.subcounties ? 'Loading subcounties...' : 'Select Subcounty'}
          </option>
          {subcounties.map((subcounty) => (
            <option key={subcounty.id} value={subcounty.id}>
              {subcounty.name}
            </option>
          ))}
        </select>
      </div>

      {/* Ward Dropdown */}
      <div>
        <label className="block text-sm font-medium mb-1">Ward</label>
        <select
          value={selectedWard}
          onChange={(e) => handleWardChange(e.target.value)}
          className="w-full border rounded-md px-3 py-2"
          disabled={!selectedSubcounty || loading.wards}
        >
          <option value="">
            {loading.wards ? 'Loading wards...' : 'Select Ward'}
          </option>
          {wards.map((ward) => (
            <option key={ward.id} value={ward.id}>
              {ward.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default LocationSelector;
