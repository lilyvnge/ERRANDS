import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { taskService } from '../../services/taskService';
import type { Task } from '../../types';
import { MapPin, Clock, PlayCircle, Loader2 } from 'lucide-react';

const VendorJobs: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'active' | 'completed'>('active');

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      // Fetch all vendor tasks
      const data = await taskService.getMyTasks('vendor');
      setTasks(data.tasks);
    } catch (error) {
      console.error('Failed to load jobs', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter logic: Active includes 'assigned' and 'in-progress'
  const filteredTasks = tasks.filter(t => 
    filter === 'active' 
      ? ['assigned', 'in-progress', 'completion-requested'].includes(t.status)
      : t.status === 'completed'
  );

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="max-w-5xl mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Jobs</h1>
        
        {/* Toggle Filter */}
        <div className="bg-gray-100 p-1 rounded-lg flex space-x-1">
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              filter === 'active' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              filter === 'completed' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Completed
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
            <p className="text-gray-500">No {filter} jobs found.</p>
            {filter === 'active' && (
              <Link to="/tasks" className="text-blue-600 hover:underline mt-2 inline-block">
                Browse available tasks
              </Link>
            )}
          </div>
        ) : (
          filteredTasks.map(task => (
            <div key={task._id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize 
                      ${task.status === 'in-progress' ? 'bg-blue-100 text-blue-800' : 
                        task.status === 'completed' ? 'bg-green-100 text-green-800' : 
                        task.status === 'completion-requested' ? 'bg-amber-100 text-amber-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {task.status.replace('-', ' ')}
                    </span>
                    <span className="text-xs text-gray-500">{new Date(task.createdAt).toLocaleDateString()}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                  <div className="mt-2 flex items-center text-sm text-gray-500 space-x-4">
                    <span className="flex items-center"><MapPin className="h-4 w-4 mr-1" /> {task.location?.address}</span>
                    <span className="flex items-center"><Clock className="h-4 w-4 mr-1" /> {task.estimatedHours} hrs est.</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">KES {task.budget.toLocaleString()}</p>
                  <p className={`text-xs font-medium mt-1 ${
                    task.paymentStatus === 'paid' ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    Payment: {task.paymentStatus}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end space-x-3">
                <Link
                  to={`/tasks/${task._id}`}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  View Details
                </Link>
                {task.status !== 'completed' && (
                  <Link
                    to={`/tasks/${task._id}`}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Open Task
                  </Link>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default VendorJobs;
