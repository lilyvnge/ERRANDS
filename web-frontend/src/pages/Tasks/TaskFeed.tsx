import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { taskService } from '../../services/taskService';
import type { Task, TaskCategory } from '../../types';
import { MapPin, Clock, DollarSign, Filter, Search, Loader2 } from 'lucide-react';

const CATEGORIES: TaskCategory[] = [
  'laundry', 'cleaning', 'grocery-shopping', 'plumbing', 
  'electrical', 'carpentry', 'babysitting', 'gardening', 'petcare', 'moving', 'other'
]; // Normalized from Task.js and User.js enums

const TaskFeed: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: '',
    minBudget: '',
    maxBudget: '',
    search: ''
  });

  const fetchTasks = async () => {
    setLoading(true);
    try {
      // Convert filters to appropriate types for service
      const queryParams: any = { ...filters };
      if (!queryParams.category) delete queryParams.category;
      if (!queryParams.minBudget) delete queryParams.minBudget;
      
      const data = await taskService.getAll(queryParams);
      setTasks(data.tasks);
    } catch (error) {
      console.error('Failed to fetch tasks', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Debounce search could be added here
    fetchTasks();
  }, [filters.category]); // Auto-refresh on category change

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTasks();
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Available Errands</h1>
        <p className="mt-2 text-gray-600">Find tasks near you and start earning.</p>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Category Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <select
              name="category"
              value={filters.category}
              onChange={handleFilterChange}
              className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 border"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat} className="capitalize">
                  {cat.replace('-', ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Budget Min */}
          <div className="relative">
            <DollarSign className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="number"
              name="minBudget"
              placeholder="Min Budget"
              value={filters.minBudget}
              onChange={handleFilterChange}
              className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 border"
            />
          </div>

          {/* Search Button */}
          <div className="md:col-start-4">
            <button
              type="submit"
              className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Search className="mr-2 h-5 w-5" />
              Find Tasks
            </button>
          </div>
        </form>
      </div>

      {/* Task Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-lg border border-dashed border-gray-300">
          <p className="text-gray-500 text-lg">No tasks found matching your criteria.</p>
          <button 
            onClick={() => setFilters({ category: '', minBudget: '', maxBudget: '', search: '' })}
            className="mt-2 text-blue-600 hover:text-blue-500 font-medium"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task) => (
            <div key={task._id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow flex flex-col">
              <div className="p-5 flex-1">
                <div className="flex justify-between items-start">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                    {task.category.replace('-', ' ')}
                  </span>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    task.urgency === 'high' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {task.urgency} Priority
                  </span>
                </div>
                
                <h3 className="mt-3 text-lg font-medium text-gray-900 line-clamp-1">{task.title}</h3>
                <p className="mt-2 text-sm text-gray-500 line-clamp-2">{task.description}</p>
                
                <div className="mt-4 flex items-center text-sm text-gray-500">
                  <MapPin className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                  <span className="truncate">{task.location?.address || 'Remote / No address'}</span>
                </div>
                
                <div className="mt-2 flex items-center text-sm text-gray-500">
                  <Clock className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                  <span>Posted {new Date(task.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="bg-gray-50 px-5 py-4 border-t border-gray-200 rounded-b-lg flex items-center justify-between">
                <span className="text-lg font-bold text-gray-900">
                  KES {task.budget.toLocaleString()}
                </span>
                <Link
                  to={`/tasks/${task._id}`}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none"
                >
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TaskFeed;