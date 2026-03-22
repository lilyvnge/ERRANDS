import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { taskService } from '../../services/taskService';
import type { Task } from '../../types';
import { Briefcase, CheckCircle, Clock, Plus, Loader2 } from 'lucide-react';

const DashboardHome: React.FC = () => {
  const { user } = useAuthStore();
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0 });

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) return;
      try {
        // Fetch tasks based on role
        const roleType = user.role === 'employer' ? 'employer' : 'vendor';
        const data = await taskService.getMyTasks(roleType, 1);
        
        setRecentTasks(data.tasks.slice(0, 5));
        
        // Simple stats calculation from the fetched page (In real app, backend should provide this)
        const total = data.total;
        const completed = data.tasks.filter((t: Task) => t.status === 'completed').length;
        setStats({
          total,
          completed,
          pending: total - completed
        });
        
      } catch (error) {
        console.error('Dashboard load error', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

  if (loading) return <div className="p-8"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Welcome Section */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.name}!</h1>
          <p className="text-gray-600">Here's what's happening with your errands.</p>
        </div>
        {user?.role === 'employer' && (
          <Link
            to="/tasks/create"
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 shadow-sm transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Post New Task
          </Link>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-full">
              <Briefcase className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Tasks</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Completed</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.completed}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-full">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active / Pending</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.pending}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
          <Link to="/my-tasks" className="text-sm text-blue-600 hover:text-blue-500">
            View all
          </Link>
        </div>
        <div className="divide-y divide-gray-200">
          {recentTasks.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No recent activity found.
            </div>
          ) : (
            recentTasks.map((task) => (
              <div key={task._id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <Link to={`/tasks/${task._id}`} className="text-md font-medium text-blue-600 hover:text-blue-800">
                      {task.title}
                    </Link>
                    <div className="mt-1 text-sm text-gray-500 flex items-center gap-4">
                      <span className="capitalize bg-gray-100 px-2 py-0.5 rounded text-xs">
                        {task.category}
                      </span>
                      <span>
                        {new Date(task.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      task.status === 'completed' ? 'bg-green-100 text-green-800' :
                      task.status === 'assigned' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {task.status}
                    </span>
                    <span className="mt-1 text-sm font-medium text-gray-900">
                      KES {task.budget.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;