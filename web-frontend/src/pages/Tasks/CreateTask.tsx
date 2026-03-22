import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { taskService } from '../../services/taskService';
import type { TaskCategory } from '../../types';
import { Loader2, ArrowLeft } from 'lucide-react';
import LocationPicker from '../../components/LocationPicker';

const CATEGORIES: TaskCategory[] = [
  'laundry', 'cleaning', 'grocery-shopping', 'plumbing', 
  'electrical', 'carpentry', 'babysitting', 'gardening', 'petcare', 'moving', 'other'
];

const CreateTask: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'cleaning' as TaskCategory,
    budget: '',
    urgency: 'medium',
    estimatedHours: '',
    address: '',
    coordinates: [36.8219, -1.2921] as [number, number] // default Nairobi lng,lat
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await taskService.create({
        ...formData,
        budget: Number(formData.budget),
        estimatedHours: formData.estimatedHours ? Number(formData.estimatedHours) : undefined,
        location: {
          address: formData.address,
          coordinates: formData.coordinates
        }
      });
      navigate('/tasks'); // Redirect to feed
    } catch (error) {
      alert('Failed to create task');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="mb-6 flex items-center">
        <button onClick={() => navigate(-1)} className="mr-4 text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Post a New Task</h1>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Task Title</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
              placeholder="e.g., House Cleaning needed"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <select
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value as TaskCategory})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 capitalize"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat.replace('-', ' ')}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Urgency</label>
              <select
                value={formData.urgency}
                onChange={e => setFormData({...formData, urgency: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              required
              rows={4}
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
              placeholder="Describe what needs to be done..."
            />
          </div>

          <LocationPicker
            value={{ address: formData.address, coordinates: formData.coordinates }}
            onChange={(loc) => setFormData({ ...formData, address: loc.address, coordinates: loc.coordinates })}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Budget (KES)</label>
              <input
                type="number"
                required
                min="0"
                value={formData.budget}
                onChange={e => setFormData({...formData, budget: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Est. Hours</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={formData.estimatedHours}
                onChange={e => setFormData({...formData, estimatedHours: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
              />
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Post Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTask;
