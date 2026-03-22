import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { adminService } from '../../services/adminService';
import api from '../../services/api';
import type { User } from '../../types';
import { ShieldCheck, AlertTriangle, ClipboardList, TrendingUp, Users, Loader2 } from 'lucide-react';
import { useNotificationStore } from '../../store/useNotificationStore';

interface VerificationItem extends User {
  vendorProfile: NonNullable<User['vendorProfile']>;
}

interface Dispute {
  _id: string;
  task: { _id: string; title: string };
  raisedBy?: { _id: string; name: string; email?: string; phone?: string };
  against?: { _id: string; name: string; email?: string; phone?: string };
  status: string;
  type: string;
  title: string;
  description: string;
  createdAt: string;
  messages?: { sender?: { name: string; role?: string }; message: string; createdAt: string; isInternal?: boolean }[];
  evidence?: { url?: string; description?: string }[];
}

interface Activity {
  _id: string;
  action: string;
  resourceType: string;
  admin?: { name: string; email: string };
  timestamp: string;
  details?: any;
}

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  isActive: boolean;
  location?: {
    address?: string;
    coordinates?: [number, number];
  };
  stats?: {
    tasksCompleted?: number;
    taskCreated?: number;
    totalEarned?: number;
    totalSpent?: number;
    averageRating?: number;
  };
  vendorProfile?: {
    isVerified?: boolean;
    skills?: string[];
    description?: string;
    hourlyRate?: number;
    verification?: {
      status?: string;
    };
  };
}

interface AdminTask {
  _id: string;
  title: string;
  status: string;
  paymentStatus?: string;
  category?: string;
  budget?: number;
  employer?: { name: string; email?: string };
  assignedVendor?: { name: string; email?: string };
}

const AdminDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const addToast = useNotificationStore((s) => s.addToast);
  const [loading, setLoading] = useState(true);
  const [verifications, setVerifications] = useState<VerificationItem[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [overview, setOverview] = useState<any>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [disputeStatus] = useState<'open' | 'under_review' | 'resolved' | 'closed' | 'escalated' | 'all'>('all');
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [note, setNote] = useState('');
  const [resolution, setResolution] = useState({ status: 'resolved', notes: '', decision: '', amountRefunded: 0, feedbackToParties: '' });
  const [activityFilters, setActivityFilters] = useState({ action: 'all', resourceType: 'all', adminId: '', dateFrom: '', dateTo: '', page: 1, limit: 10 });
  const [activityPagination, setActivityPagination] = useState({ currentPage: 1, totalPages: 1, total: 0 });
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userFilters, setUserFilters] = useState({ role: 'all', isActive: 'all', search: '', page: 1, limit: 8 });
  const [userPagination, setUserPagination] = useState({ currentPage: 1, totalPages: 1, totalUsers: 0 });
  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [taskFilters, setTaskFilters] = useState({ status: 'all', payment: 'all', search: '', page: 1, limit: 8 });
  const [taskPagination, setTaskPagination] = useState({ currentPage: 1, totalPages: 1, total: 0 });
  const [notifications, setNotifications] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const openDisputes = disputes.filter((d) => d.status === 'open');

  const openDocument = (url?: string) => {
    if (!url) {
      alert('No document URL found.');
      return;
    }
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('Failed to open document', err);
      alert('Unable to open document. Copy the link and open in a new tab.');
    }
  };
  const openDirectChat = async (userId: string) => {
    try {
      const res = await api.get(`/chat/direct/${userId}`);
      const conversationId = res.data?.conversation?._id;
      if (conversationId) {
        window.open(`/chat/${conversationId}`, '_blank', 'noopener,noreferrer');
      } else {
        alert('Unable to start chat');
      }
    } catch (err) {
      console.error('Direct chat error', err);
      alert('Unable to start chat');
    }
  };

  useEffect(() => {
    if (user?.role !== 'admin') return;
    loadData();
  }, [user]);
  useEffect(() => {
    if (user?.role !== 'admin') return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disputeStatus]);
  useEffect(() => {
    if (user?.role !== 'admin') return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityFilters, userFilters, taskFilters]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const verRes = await adminService.getVerifications('pending');
      setVerifications(verRes.verifications || verRes.requests || verRes || []);

      const dispRes = await adminService.getDisputes({ status: disputeStatus === 'all' ? undefined : disputeStatus });
      setDisputes(dispRes.disputes || dispRes || []); 

      const ovRes = await adminService.getOverview();
      setOverview(ovRes.overview || ovRes);

      const actRes = await adminService.getActivities({
        page: activityFilters.page,
        limit: activityFilters.limit,
        action: activityFilters.action !== 'all' ? activityFilters.action : undefined,
        resourceType: activityFilters.resourceType !== 'all' ? activityFilters.resourceType : undefined,
        adminId: activityFilters.adminId || undefined,
        dateFrom: activityFilters.dateFrom || undefined,
        dateTo: activityFilters.dateTo || undefined
      });
      setActivities(actRes.activities || []);
      setActivityPagination(actRes.pagination || { currentPage: 1, totalPages: 1, total: 0 });

      const usersRes = await adminService.getUsers({
        page: userFilters.page,
        limit: userFilters.limit,
        role: userFilters.role !== 'all' ? userFilters.role : undefined,
        isActive: userFilters.isActive === 'all' ? undefined : userFilters.isActive,
        search: userFilters.search || undefined
      });
      setUsers(usersRes.users || usersRes || []);
      setUserPagination(usersRes.pagination || { currentPage: 1, totalPages: 1, totalUsers: 0 });

      const tasksRes = await adminService.getTasks({
        page: taskFilters.page,
        limit: taskFilters.limit,
        status: taskFilters.status !== 'all' ? taskFilters.status : undefined,
        hasPayment: taskFilters.payment !== 'all' ? (taskFilters.payment === 'paid' ? 'true' : 'false') : undefined,
        search: taskFilters.search || undefined
      });
      setTasks(tasksRes.tasks || tasksRes || []);
      setTaskPagination(tasksRes.pagination || { currentPage: 1, totalPages: 1, total: 0 });

      const notifRes = await adminService.getNotifications();
      if (Array.isArray(notifRes.notifications)) {
        // Simple new notification toast on increase
        if (notifRes.notifications.length > notifications.length) {
          addToast({ title: 'New notification', description: notifRes.notifications[0]?.title || 'New admin notification', type: 'info' });
        }
        setNotifications(notifRes.notifications);
      }
    } catch (err: any) {
      console.error('Admin load error', err);
      setError(err?.response?.data?.message || 'Failed to load admin data. Ensure you are logged in as an admin.');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (id: string, status: 'resolved' | 'rejected') => {
    setResolvingId(id);
    try {
      await adminService.resolveDispute(id, { status, notes: status === 'resolved' ? 'Approved' : 'Rejected' });
      await loadData();
    } catch (err) {
      console.error('Resolve dispute error', err);
      alert('Failed to resolve dispute');
    } finally {
      setResolvingId(null);
    }
  };

  const handleReview = async (id: string, status: 'verified' | 'rejected') => {
    const reason = status === 'rejected' ? window.prompt('Reason for rejection?') || '' : undefined;
    setReviewingId(id);
    try {
      await adminService.reviewVerification(id, status, reason);
      await loadData();
    } catch (err) {
      console.error('Review verification error', err);
      alert('Failed to update verification');
    } finally {
      setReviewingId(null);
    }
  };

  const handleSendNote = async () => {
    if (!selectedDispute || !note.trim()) return;
    try {
      await adminService.addDisputeMessage(selectedDispute._id, { message: note, isInternal: true });
      setNote('');
      await loadData();
      const refreshed = disputes.find(d => d._id === selectedDispute._id);
      setSelectedDispute(refreshed || null);
    } catch (err) {
      alert('Failed to add note');
    }
  };

  const handleResolveDetailed = async () => {
    if (!selectedDispute) return;
    setResolvingId(selectedDispute._id);
    try {
      await adminService.resolveDispute(selectedDispute._id, resolution as any);
      await loadData();
      setSelectedDispute(null);
    } catch (err) {
      alert('Failed to resolve dispute');
    } finally {
      setResolvingId(null);
    }
  };

  if (user?.role !== 'admin') {
    return <div className="p-10 text-center text-red-500">Admins only.</div>;
  }

  if (loading) {
    return <div className="p-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600">Manage verification requests and disputes.</p>
        <div className="flex items-center gap-3 mt-3">
          <button
            onClick={loadData}
            className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
          >
            Refresh
          </button>

          {/* <select 
            value={disputeStatus}
            onChange={(e) => setDisputeStatus(e.target.value as any)}
            className="px-3 py-1.5 text-sm rounded-md border border-gray-200 text-gray-700 bg-white"
            >
            <option value="open">Open</option>
            <option value="under_review">Under review</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
            <option value="escalated">Escalated</option>
            <option value="all">All</option>
          </select> */}

          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Overview cards */}
      {overview && (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-700">
              <Users className="h-5 w-5 text-blue-600" />
              <p className="text-sm font-semibold text-gray-700">Users</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-2">{overview.totalUsers}</p>
            <p className="text-xs text-gray-500">Employers: {overview.totalEmployers} | Vendors: {overview.totalVendors}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-700">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <p className="text-sm font-semibold text-gray-700">Revenue</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-2">KES {overview.revenue?.totalRevenue?.toLocaleString() || 0}</p>
            <p className="text-xs text-gray-500">Payouts: KES {overview.revenue?.totalPaidToVendors?.toLocaleString() || 0}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-700">
              <ClipboardList className="h-5 w-5 text-amber-600" />
              <p className="text-sm font-semibold text-gray-700">Tasks</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-2">{overview.totalTasks}</p>
            <p className="text-xs text-gray-500">Completed: {overview.taskStatusCounts?.find((t: any) => t._id === 'completed')?.count || 0}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-700">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <p className="text-sm font-semibold text-gray-700">Verifications</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-2">{verifications.length}</p>
            <p className="text-xs text-gray-500">Pending vendor checks</p>
          </div>
        </div>
      )}

      {/* User management */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <div className="flex items-center gap-2 text-gray-700 mb-2">
          <Users className="h-5 w-5" />
          <h2 className="text-lg font-semibold text-gray-900">User management</h2>
        </div>
        <p className="text-sm text-gray-600 mb-3">Filter by role/status and activate/deactivate accounts.</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3">
          <select
            value={userFilters.role}
            onChange={(e) => setUserFilters({ ...userFilters, role: e.target.value, page: 1 })}
            className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
          >
            <option value="all">All roles</option>
            <option value="employer">Employer</option>
            <option value="vendor">Vendor</option>
            <option value="admin">Admin</option>
          </select>
          <select
            value={userFilters.isActive}
            onChange={(e) => setUserFilters({ ...userFilters, isActive: e.target.value, page: 1 })}
            className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="true">Active</option>
            <option value="false">Deactivated</option>
          </select>
          <input
            type="text"
            value={userFilters.search}
            onChange={(e) => setUserFilters({ ...userFilters, search: e.target.value, page: 1 })}
            placeholder="Search name/email"
            className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setUserFilters({ ...userFilters, page: Math.max(1, userFilters.page - 1) })}
              disabled={userPagination.currentPage <= 1}
              className="px-3 py-1 rounded-md border border-gray-200 text-sm disabled:opacity-50"
            >
              Prev
            </button>
            <button
              onClick={() => setUserFilters({ ...userFilters, page: userFilters.page + 1 })}
              disabled={userPagination.currentPage >= userPagination.totalPages}
              className="px-3 py-1 rounded-md border border-gray-200 text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
        {users.length === 0 ? (
          <p className="text-sm text-gray-500">No users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2 text-gray-600 font-semibold">Name</th>
                  <th className="text-left px-3 py-2 text-gray-600 font-semibold">Contact</th>
                  <th className="text-left px-3 py-2 text-gray-600 font-semibold">Role</th>
                  <th className="text-left px-3 py-2 text-gray-600 font-semibold">Location</th>
                  <th className="text-left px-3 py-2 text-gray-600 font-semibold">Vendor profile</th>
                  <th className="text-left px-3 py-2 text-gray-600 font-semibold">Status</th>
                  <th className="text-left px-3 py-2 text-gray-600 font-semibold">Stats</th>
                  <th className="text-left px-3 py-2 text-gray-600 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u._id}>
                    <td className="px-3 py-2">{u.name}</td>
                    <td className="px-3 py-2 text-xs text-gray-700">
                      <div>{u.email}</div>
                      <div className="text-gray-500">{u.phone || '-'}</div>
                    </td>
                    <td className="px-3 py-2 capitalize">{u.role}</td>
                    <td className="px-3 py-2 text-xs text-gray-700">
                      <div>{u.location?.address || '-'}</div>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-700">
                      {u.role === 'vendor' ? (
                        <div className="space-y-1">
                          <div>
                            <span className="font-semibold">Skills:</span>{' '}
                            {(u.vendorProfile?.skills || []).length ? (u.vendorProfile?.skills || []).join(', ') : '-'}
                          </div>
                          <div className="text-gray-500">{u.vendorProfile?.description || '-'}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-1 text-[11px] rounded-full ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {u.isActive ? 'Active' : 'Deactivated'}
                      </span>
                      {u.role === 'vendor' && (
                        <>
                          <span className={`ml-2 px-2 py-1 text-[11px] rounded-full ${u.vendorProfile?.isVerified ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                            {u.vendorProfile?.isVerified ? 'Verified' : 'Unverified'}
                          </span>
                        </>
                      )}
                    </td>
                                        <td className="px-3 py-2 text-xs text-gray-600">
                      {u.role === 'vendor'
                        ? `Completed: ${u.stats?.tasksCompleted || 0} | Earned: KES ${u.stats?.totalEarned || 0} | Rating: ${u.stats?.averageRating || 0}`
                        : u.role === 'employer'
                        ? `Posted: ${u.stats?.taskCreated || 0} | Spent: KES ${u.stats?.totalSpent || 0} | Rating: ${u.stats?.averageRating || 0}`
                        : '-'}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedUser(u)}
                          className="px-3 py-1 text-xs rounded-md border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100"
                        >
                          View profile
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              await adminService.updateUserStatus(u._id, !u.isActive);
                              await loadData();
                            } catch (err) {
                              alert('Failed to update user');
                            }
                          }}
                          className={`px-3 py-1 text-xs rounded-md border ${u.isActive ? 'border-red-200 text-red-700 bg-red-50 hover:bg-red-100' : 'border-green-200 text-green-700 bg-green-50 hover:bg-green-100'}`}
                        >
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <ShieldCheck className="h-5 w-5" />
            <h2 className="text-lg font-semibold text-gray-900">Verification Queue</h2>
          </div>
          {verifications.length === 0 ? (
            <p className="text-sm text-gray-500">No pending verifications.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {verifications.map((v) => (
                <div key={v._id} className="py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{v.name}</p>
                      <p className="text-xs text-gray-500">{v.email}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(v.vendorProfile?.skills || []).map((s) => (
                          <span key={s} className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] capitalize">
                            {s.replace('-', ' ')}
                          </span>
                        ))}
                      </div>
                      {v.vendorProfile?.verification && 'documents' in v.vendorProfile.verification && v.vendorProfile.verification.documents && v.vendorProfile.verification.documents.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <p className="text-xs font-semibold text-gray-700">Documents</p>
                          {(v.vendorProfile.verification.documents || []).map((doc: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between bg-gray-50 px-2 py-1 rounded">
                              <span className="text-xs text-gray-700 capitalize">{doc.documentType?.replace('_', ' ')}</span>
                              <div className="flex items-center gap-2">
                                {doc.documentUrl && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => openDocument(doc.documentUrl)}
                                      className="text-xs text-blue-600 hover:underline"
                                    >
                                      View
                                    </button>
                                    <a
                                      href={doc.documentUrl}
                                      download
                                      className="text-xs text-gray-600 hover:underline"
                                    >
                                      Download
                                    </a>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 text-[11px] rounded-full bg-amber-100 text-amber-700">Pending</span>
                      <button
                        onClick={() => openDirectChat(v._id)}
                        className="px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
                      >
                        Message Vendor
                      </button>
                      <button
                        onClick={() => handleReview(v._id, 'verified')}
                        disabled={reviewingId === v._id}
                        className="px-2 py-1 text-xs rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        {reviewingId === v._id ? '...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleReview(v._id, 'rejected')}
                        disabled={reviewingId === v._id}
                        className="px-2 py-1 text-xs rounded-md bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 text-amber-600 mb-2">
            <AlertTriangle className="h-5 w-5" />
            <h2 className="text-lg font-semibold text-gray-900">Disputes</h2>
          </div>
          {openDisputes.length === 0 ? (
            <p className="text-sm text-gray-500">No open disputes.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {openDisputes.map((d) => (
                <div key={d._id} className="py-3">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{d.task?.title || d.title || 'Task'}</p>
                      <p className="text-xs text-gray-500">Type: {d.type}</p>
                      <p className="text-xs text-gray-500">Status: {d.status}</p>
                      <p className="text-xs text-gray-500">Description: {d.description}</p>
                      <div className="mt-2 text-xs text-gray-700 space-y-1">
                        <p><span className="font-semibold">Raised by:</span> {d.raisedBy?.name || 'N/A'} ({d.raisedBy?.email || 'N/A'}) {d.raisedBy?.phone || ''}</p>
                        <p><span className="font-semibold">Against:</span> {d.against?.name || 'N/A'} ({d.against?.email || 'N/A'}) {d.against?.phone || ''}</p>
                      </div>
                    </div>
                    <span className="px-2 py-1 text-[11px] rounded-full bg-amber-100 text-amber-700 capitalize">
                      {d.status}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <button
                      onClick={() => handleResolve(d._id, 'resolved')}
                      disabled={resolvingId === d._id}
                      className="px-3 py-1 text-xs rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {resolvingId === d._id ? 'Saving...' : 'Resolve'}
                    </button>
                    <button
                      onClick={() => handleResolve(d._id, 'rejected')}
                      disabled={resolvingId === d._id}
                      className="px-3 py-1 text-xs rounded-md bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => d.raisedBy?._id && openDirectChat(d.raisedBy._id)}
                      className="px-3 py-1 text-xs rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200"
                    >
                      Message raised-by
                    </button>
                    <button
                      onClick={() => d.against?._id && openDirectChat(d.against._id)}
                      className="px-3 py-1 text-xs rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200"
                    >
                      Message counterparty
                    </button>
                    <button
                      onClick={() => window.open(`/tasks/${d.task?._id}`, '_blank')}
                      className="px-3 py-1 text-xs rounded-md bg-white text-blue-700 border border-blue-200 hover:bg-blue-50"
                    >
                      View task
                    </button>
                    <button
                      onClick={() => window.location.href = `mailto:${d.raisedBy?.email || ''}`}
                      className="px-3 py-1 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
                    >
                      Email raised-by
                    </button>
                    <button
                      onClick={() => window.location.href = `mailto:${d.against?.email || ''}`}
                      className="px-3 py-1 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
                    >
                      Email counterparty
                    </button>
                    <button
                      onClick={() => setSelectedDispute(d)}
                      className="px-3 py-1 text-xs rounded-md bg-white text-blue-700 border border-blue-200 hover:bg-blue-50"
                    >
                      View details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dispute detail drawer */}
      {selectedDispute && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex justify-end">
          <div className="w-full max-w-2xl h-full bg-white shadow-xl overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Dispute detail</p>
                <h2 className="text-xl font-semibold text-gray-900">{selectedDispute.task?.title}</h2>
                <p className="text-xs text-gray-500">Status: {selectedDispute.status}</p>
              </div>
              <button onClick={() => setSelectedDispute(null)} className="text-gray-500 hover:text-gray-700 text-sm">Close</button>
            </div>

            <div className="p-4 space-y-6">
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 space-y-1">
                <p><span className="font-semibold">Title:</span> {selectedDispute.title}</p>
                <p><span className="font-semibold">Type:</span> {selectedDispute.type}</p>
                <p><span className="font-semibold">Description:</span> {selectedDispute.description}</p>
                <p><span className="font-semibold">Raised by:</span> {selectedDispute.raisedBy?.name || 'N/A'} ({selectedDispute.raisedBy?.email || 'N/A'}) {selectedDispute.raisedBy?.phone || ''}</p>
                <p><span className="font-semibold">Against:</span> {selectedDispute.against?.name || 'N/A'} ({selectedDispute.against?.email || 'N/A'}) {selectedDispute.against?.phone || ''}</p>
              </div>

              {selectedDispute.evidence && Array.isArray(selectedDispute.evidence) && selectedDispute.evidence.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-2">Evidence</p>
                  <div className="space-y-2">
                    {(selectedDispute.evidence as any[]).map((ev, idx) => {
                      const url = typeof ev === 'string' ? ev : ev.url;
                      const desc = typeof ev === 'string' ? '' : ev.description;
                      return (
                        <div key={idx} className="space-y-1">
                          <a href={url} target="_blank" rel="noreferrer" className="text-blue-600 text-sm hover:underline">
                            View evidence {idx + 1}
                          </a>
                          {desc && <p className="text-xs text-gray-600">{desc}</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <p className="text-sm font-semibold text-gray-900 mb-2">Messages</p>
                <div className="bg-gray-50 rounded-lg p-3 space-y-2 max-h-64 overflow-y-auto">
                  {selectedDispute.messages?.length ? (
                    selectedDispute.messages.map((m, idx) => (
                      <div key={idx} className="text-sm">
                        <p className="font-semibold text-gray-800">{m.sender?.name || 'System'} <span className="text-xs text-gray-500">{new Date(m.createdAt).toLocaleString()}</span></p>
                        <p className="text-gray-700">{m.message}</p>
                        {m.isInternal && <span className="text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded">Internal</span>}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No messages yet.</p>
                  )}
                </div>
                <div className="mt-3 space-y-2">
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Add internal note"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleSendNote}
                      className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Add note
                    </button>
                  </div>
                </div>
              </div>

              <div className="border-t pt-3 space-y-2">
                <p className="text-sm font-semibold text-gray-900">Resolve dispute</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <select
                    value={resolution.status}
                    onChange={(e) => setResolution({ ...resolution, status: e.target.value })}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="resolved">Resolved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <input
                    type="number"
                    min={0}
                    value={resolution.amountRefunded}
                    onChange={(e) => setResolution({ ...resolution, amountRefunded: Number(e.target.value) })}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Refund amount (optional)"
                  />
                </div>
                <input
                  type="text"
                  value={resolution.decision}
                  onChange={(e) => setResolution({ ...resolution, decision: e.target.value })}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Decision summary"
                />
                <textarea
                  value={resolution.notes}
                  onChange={(e) => setResolution({ ...resolution, notes: e.target.value })}
                  rows={2}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Internal notes"
                />
                <textarea
                  value={resolution.feedbackToParties}
                  onChange={(e) => setResolution({ ...resolution, feedbackToParties: e.target.value })}
                  rows={2}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Feedback to parties (optional)"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setSelectedDispute(null)}
                    className="px-3 py-1.5 text-sm rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResolveDetailed}
                    disabled={resolvingId === selectedDispute._id}
                    className="px-3 py-1.5 text-sm rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {resolvingId === selectedDispute._id ? 'Saving...' : 'Save resolution'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <div className="flex items-center gap-2 text-gray-700 mb-2">
          <ClipboardList className="h-5 w-5" />
          <h2 className="text-lg font-semibold text-gray-900">Admin activity log</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-3">
          <select
            value={activityFilters.action}
            onChange={(e) => setActivityFilters({ ...activityFilters, action: e.target.value, page: 1 })}
            className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
          >
            <option value="all">All actions</option>
            <option value="dispute_resolved">Dispute resolved</option>
            <option value="dispute_message_added">Dispute message</option>
            <option value="user_status_update">User status update</option>
            <option value="task_status_update">Task status update</option>
            <option value="user_bulk_update">User bulk update</option>
            <option value="task_bulk_update">Task bulk update</option>
          </select>
          <select
            value={activityFilters.resourceType}
            onChange={(e) => setActivityFilters({ ...activityFilters, resourceType: e.target.value, page: 1 })}
            className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
          >
            <option value="all">All resources</option>
            <option value="dispute">Dispute</option>
            <option value="user">User</option>
            <option value="task">Task</option>
            <option value="payment">Payment</option>
            <option value="notification">Notification</option>
          </select>
          <input
            type="text"
            value={activityFilters.adminId}
            onChange={(e) => setActivityFilters({ ...activityFilters, adminId: e.target.value, page: 1 })}
            placeholder="Admin ID"
            className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
          />
          <input
            type="date"
            value={activityFilters.dateFrom}
            onChange={(e) => setActivityFilters({ ...activityFilters, dateFrom: e.target.value, page: 1 })}
            className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
          />
          <input
            type="date"
            value={activityFilters.dateTo}
            onChange={(e) => setActivityFilters({ ...activityFilters, dateTo: e.target.value, page: 1 })}
            className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
          />
        </div>
        {activities.length === 0 ? (
          <p className="text-sm text-gray-500">No admin actions recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2 text-gray-600 font-semibold">Action</th>
                  <th className="text-left px-3 py-2 text-gray-600 font-semibold">Resource</th>
                  <th className="text-left px-3 py-2 text-gray-600 font-semibold">By</th>
                  <th className="text-left px-3 py-2 text-gray-600 font-semibold">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activities.map((a) => (
                  <tr key={a._id}>
                    <td className="px-3 py-2 capitalize">{a.action.replace('_', ' ')}</td>
                    <td className="px-3 py-2 capitalize">{a.resourceType}</td>
                    <td className="px-3 py-2">{a.admin?.name || 'Admin'}</td>
                    <td className="px-3 py-2 text-xs text-gray-500">{new Date(a.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between mt-3 text-sm text-gray-600">
          <span>Page {activityPagination.currentPage} / {activityPagination.totalPages}</span>
          <div className="space-x-2">
            <button
              disabled={activityPagination.currentPage <= 1}
              onClick={() => setActivityFilters({ ...activityFilters, page: Math.max(1, activityFilters.page - 1) })}
              className="px-3 py-1 rounded-md border border-gray-200 disabled:opacity-50"
            >
              Prev
            </button>
            <button
              disabled={activityPagination.currentPage >= activityPagination.totalPages}
              onClick={() => setActivityFilters({ ...activityFilters, page: activityFilters.page + 1 })}
              className="px-3 py-1 rounded-md border border-gray-200 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Task management */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <div className="flex items-center gap-2 text-gray-700 mb-2">
          <ClipboardList className="h-5 w-5" />
          <h2 className="text-lg font-semibold text-gray-900">Task management</h2>
        </div>
        <p className="text-sm text-gray-600 mb-3">Filter by status/payment and override task status.</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3">
          <select
            value={taskFilters.status}
            onChange={(e) => setTaskFilters({ ...taskFilters, status: e.target.value, page: 1 })}
            className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="open">Open</option>
            <option value="assigned">Assigned</option>
            <option value="in-progress">In progress</option>
            <option value="completion-requested">Completion requested</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="disputed">Disputed</option>
          </select>
          <select
            value={taskFilters.payment}
            onChange={(e) => setTaskFilters({ ...taskFilters, payment: e.target.value, page: 1 })}
            className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
          >
            <option value="all">All payments</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
          </select>
          <input
            type="text"
            value={taskFilters.search}
            onChange={(e) => setTaskFilters({ ...taskFilters, search: e.target.value, page: 1 })}
            placeholder="Search title/description"
            className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setTaskFilters({ ...taskFilters, page: Math.max(1, taskFilters.page - 1) })}
              disabled={taskPagination.currentPage <= 1}
              className="px-3 py-1 rounded-md border border-gray-200 text-sm disabled:opacity-50"
            >
              Prev
            </button>
            <button
              onClick={() => setTaskFilters({ ...taskFilters, page: taskFilters.page + 1 })}
              disabled={taskPagination.currentPage >= taskPagination.totalPages}
              className="px-3 py-1 rounded-md border border-gray-200 text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
        {tasks.length === 0 ? (
          <p className="text-sm text-gray-500">No tasks found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2 text-gray-600 font-semibold">Title</th>
                  <th className="text-left px-3 py-2 text-gray-600 font-semibold">Status</th>
                  <th className="text-left px-3 py-2 text-gray-600 font-semibold">Payment</th>
                  <th className="text-left px-3 py-2 text-gray-600 font-semibold">Budget</th>
                  <th className="text-left px-3 py-2 text-gray-600 font-semibold">Employer</th>
                  <th className="text-left px-3 py-2 text-gray-600 font-semibold">Vendor</th>
                  <th className="text-left px-3 py-2 text-gray-600 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tasks.map((t) => (
                  <tr key={t._id}>
                    <td className="px-3 py-2">{t.title}</td>
                    <td className="px-3 py-2 capitalize">{t.status.replace('-', ' ')}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-1 text-[11px] rounded-full ${t.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {t.paymentStatus || 'pending'}
                      </span>
                    </td>
                    <td className="px-3 py-2">KES {t.budget?.toLocaleString() || '-'}</td>
                    <td className="px-3 py-2 text-xs text-gray-700">{t.employer?.name || '-'}</td>
                    <td className="px-3 py-2 text-xs text-gray-700">{t.assignedVendor?.name || '-'}</td>
                    <td className="px-3 py-2">
                      <select
                        value={t.status}
                        onChange={async (e) => {
                          try {
                            await adminService.updateTaskStatus(t._id, e.target.value);
                            await loadData();
                          } catch (err) {
                            alert('Failed to update task');
                          }
                        }}
                        className="border border-gray-300 rounded-md px-2 py-1 text-xs"
                      >
                        <option value="open">open</option>
                        <option value="assigned">assigned</option>
                        <option value="in-progress">in-progress</option>
                        <option value="completion-requested">completion-requested</option>
                        <option value="completed">completed</option>
                        <option value="cancelled">cancelled</option>
                        <option value="disputed">disputed</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex justify-end">
          <div className="w-full max-w-2xl h-full bg-white shadow-xl overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">User profile</p>
                <h2 className="text-xl font-semibold text-gray-900">{selectedUser.name}</h2>
                <p className="text-xs text-gray-500">{selectedUser.email}</p>
              </div>
              <button onClick={() => setSelectedUser(null)} className="text-gray-500 hover:text-gray-700 text-sm">Close</button>
            </div>

            <div className="p-4 space-y-6">
              {selectedUser.role === 'vendor' && (selectedUser.vendorProfile?.verification as any)?.documents?.length ? (
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-2">Verification documents</p>
                  <div className="space-y-2">
                    {((selectedUser.vendorProfile?.verification as any)?.documents || []).map((doc: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                        <div>
                          <p className="text-sm text-gray-800 capitalize">{doc.documentType?.replace('_', ' ') || 'Document'}</p>
                          <p className="text-xs text-gray-500">Status: {doc.status || 'pending'}</p>
                        </div>
                        {doc.documentUrl ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openDocument(doc.documentUrl)}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              View
                            </button>
                            <a
                              href={doc.documentUrl}
                              download
                              className="text-xs text-gray-600 hover:underline"
                            >
                              Download
                            </a>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">No file</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No verification documents.</p>
              )}

              <div>
                <p className="text-sm font-semibold text-gray-900 mb-2">Full record (JSON)</p>
                <pre className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-x-auto">
                  {JSON.stringify(selectedUser, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

