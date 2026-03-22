import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import type { UserRole, TaskCategory } from '../../types';
import { Briefcase, User, Loader2, AlertCircle } from 'lucide-react';
import LocationPicker from '../../components/LocationPicker';

// Categories matching User.js vendorProfile.skills enum
const SKILLS: TaskCategory[] = [
  'laundry', 'cleaning', 'grocery-shopping', 'plumbing', 
  'electrical', 'carpentry', 'babysitting', 'gardening', 'petcare', 'moving', 'other'
];

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuthStore();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'employer' as UserRole,
    // Vendor specific
    skills: [] as TaskCategory[],
    description: '',
    hourlyRate: '',
    address: '',
    coordinates: [36.8219, -1.2921] as [number, number] // default Nairobi lng/lat
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSkillToggle = (skill: TaskCategory) => {
    setFormData(prev => {
      const skills = prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill];
      return { ...prev, skills };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Format data for backend
    const payload = {
      ...formData,
      location: {
        address: formData.address,
        coordinates: formData.coordinates
      },
      vendorProfile: formData.role === 'vendor' ? {
        skills: formData.skills,
        description: formData.description,
        hourlyRate: Number(formData.hourlyRate)
      } : undefined
    };

    try {
      await register(payload);
      navigate('/dashboard');
    } catch (err) {
      // Error handled by store
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Join WERA
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Create an account to get started
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 flex justify-between">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
              <button onClick={clearError} className="text-red-400 hover:text-red-500">&times;</button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Role Selection */}
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: 'employer' })}
                className={`flex flex-col items-center p-4 border rounded-lg transition-all ${
                  formData.role === 'employer' 
                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <User className="h-6 w-6 mb-2" />
                <span className="font-medium text-sm">I need help (Employer)</span>
              </button>
              
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: 'vendor' })}
                className={`flex flex-col items-center p-4 border rounded-lg transition-all ${
                  formData.role === 'vendor' 
                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Briefcase className="h-6 w-6 mb-2" />
                <span className="font-medium text-sm">I want to work (Vendor)</span>
              </button>
            </div>

            {/* Basic Fields */}
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-6">
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <input
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="sm:col-span-6">
                <label className="block text-sm font-medium text-gray-700">Email address</label>
                <input
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="sm:col-span-6">
                <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                <input
                  name="phone"
                  type="tel"
                  placeholder="07..."
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

            <div className="sm:col-span-6">
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                name="password"
                type="password"
                required
                minLength={6}
                value={formData.password}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Location (required for all) */}
          <div className="pt-2 border-t">
            <LocationPicker
              value={{ address: formData.address, coordinates: formData.coordinates }}
              onChange={(loc) => setFormData({ ...formData, address: loc.address, coordinates: loc.coordinates })}
            />
          </div>

            {/* Vendor Specific Fields */}
            {formData.role === 'vendor' && (
              <div className="space-y-6 border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900">Vendor Profile</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select your skills</label>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border rounded-md">
                    {SKILLS.map(skill => (
                      <label key={skill} className="flex items-center space-x-2 cursor-pointer p-1 hover:bg-gray-50 rounded">
                        <input
                          type="checkbox"
                          checked={formData.skills.includes(skill)}
                          onChange={() => handleSkillToggle(skill)}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm capitalize">{skill.replace('-', ' ')}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Short Bio / Description</label>
                  <textarea
                    name="description"
                    rows={3}
                    value={formData.description}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Tell employers about your experience..."
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
