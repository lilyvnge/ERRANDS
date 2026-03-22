import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { taskService } from '../../services/taskService';
import type { Task } from '../../types';
import { useAuthStore } from '../../store/useAuthStore';
import { MapPin, DollarSign, MessageSquare, CheckCircle, User, AlertTriangle, PlayCircle, HandCoins, ShieldAlert } from 'lucide-react';
import PaymentModal from '../../components/Modals/PaymentModal';
import api from '../../services/api'; // Direct API access for chat init
import { paymentService } from '../../services/paymentService';
import RatingModal from '../../components/Modals/RatingModal';
import { useNotificationStore } from '../../store/useNotificationStore';
import { disputeService } from '../../services/disputeService';

const TaskDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingTarget, setRatingTarget] = useState<'vendor' | 'employer'>('vendor');
  const addToast = useNotificationStore((s) => s.addToast);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeForm, setDisputeForm] = useState({ title: '', type: 'service_not_provided', description: '', evidence: '' });
  const [budgetDraft, setBudgetDraft] = useState('');
  const [budgetSaving, setBudgetSaving] = useState(false);

  useEffect(() => {
    fetchTask();
  }, [id]);

  useEffect(() => {
    if (!task?.completionExpiresAt || task.status !== 'completion-requested') {
      setTimeLeft(null);
      return;
    }
    const interval = setInterval(() => {
      const diff = new Date(task.completionExpiresAt!).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('Auto-approving...');
        clearInterval(interval);
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${minutes}m ${seconds}s`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [task?.completionExpiresAt, task?.status]);

  const fetchTask = async () => {
    try {
      if (!id) return;
      const data = await taskService.getById(id);
      setTask(data.task);
      if (data.task?.budget !== undefined) {
        setBudgetDraft(String(data.task.budget));
      }
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to load task details' });
    } finally {
      setLoading(false);
    }
  };

  // --- Actions ---

  // 1. Vendor Accepts Task
  const handleAcceptTask = async () => {
    if (!task || !user) return;
    setActionLoading(true);
    try {
      const updated = await taskService.assignSelf(task._id);
      setTask(updated.task);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to accept task');
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Mark as Completed (Employer or Vendor)
  const handleCompleteTask = async () => {
    if (!task) return;
    if (!window.confirm('Approve completion? This will close the task.')) return;
    
    setActionLoading(true);
    try {
      const updated = await taskService.updateStatus(task._id, 'completed');
      setTask(updated.task);
    } catch (err: any) {
      alert('Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  // 2b. Start Work (moves to in-progress)
  const handleStartTask = async () => {
    if (!task) return;
    setActionLoading(true);
    try {
      const updated = await taskService.updateStatus(task._id, 'in-progress');
      setTask(updated.task);
    } catch (err: any) {
      alert('Failed to start task');
    } finally {
      setActionLoading(false);
    }
  };

  // Vendor requests completion
  const handleRequestCompletion = async () => {
    if (!task) return;
    setActionLoading(true);
    try {
      const updated = await taskService.updateStatus(task._id, 'completion-requested');
      setTask(updated.task);
      addToast({ title: 'Completion requested', description: 'Awaiting client approval (1h window).', type: 'info' });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to request completion');
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Initialize Chat
  const handleChat = async () => {
    if (!task) return;
    try {
      // Direct call to chatController.getOrCreateConversation
      const res = await api.get(`/chat/conversation/${task._id}`);
      // Navigate to chat page with the conversation ID
      navigate(`/chat/${res.data.conversation._id}`);
    } catch (err) {
      console.error('Chat init error', err);
      alert('Could not start chat. Ensure a vendor is assigned.');
    }
  };

  // 4. Record cash payment (employer)
  const handleRecordCashPayment = async () => {
    if (!task) return;
    const amountStr = window.prompt('Enter cash amount received (KES):', task.budget.toString());
    if (!amountStr) return;
    const amount = Number(amountStr);
    if (Number.isNaN(amount) || amount <= 0) {
      alert('Enter a valid amount');
      return;
    }
    const notes = window.prompt('Optional notes for this cash payment:', '');
    setActionLoading(true);
    try {
      await paymentService.createCashRecord(task._id, amount, notes || undefined);
      await fetchTask();
      addToast({ title: 'Cash recorded', description: `KES ${amount.toLocaleString()} for ${task.title}`, type: 'success' });
      alert('Cash payment recorded.');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to record cash payment');
    } finally {
      setActionLoading(false);
    }
  };

  // 5. Submit rating
  const handleSubmitRating = async (rating: number, comment: string) => {
    if (!task) return;
    setActionLoading(true);
    try {
      await taskService.rateUser(task._id, {
        rating,
        comment,
        rateeRole: ratingTarget
      });
      setShowRatingModal(false);
      await fetchTask();
      alert('Rating submitted');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit rating');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;
    setActionLoading(true);
    try {
      await disputeService.create({
        taskId: task._id,
        title: disputeForm.title,
        type: disputeForm.type,
        description: disputeForm.description,
        evidence: disputeForm.evidence
          ? disputeForm.evidence.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined
      });
      // Mark task as disputed for visibility, but don't fail if that call errors.
      try {
        await taskService.updateStatus(task._id, 'disputed');
      } catch (err) {
        console.warn('Task status update after dispute failed', err);
      }
      await fetchTask();
      addToast({ title: 'Dispute submitted', description: 'We will review this dispute.', type: 'info' });
      setShowDisputeModal(false);
      setDisputeForm({ title: '', type: 'service_not_provided', description: '', evidence: '' });
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to create dispute');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="p-10 text-center">Loading task...</div>;
  if (!task || !user) return <div className="p-10 text-center text-red-500">Task not found</div>;

  // --- Derived State for UI Logic ---
  const isEmployer = typeof task.employer === 'object' ? task.employer._id === user._id : task.employer === user._id;
  const isAssignedVendor = typeof task.assignedVendor === 'object' 
    ? task.assignedVendor?._id === user._id 
    : task.assignedVendor === user._id;

  const isTaskParticipant = isEmployer || isAssignedVendor;
  const isVendorVerified = user.role === 'vendor' ? user.vendorProfile?.isVerified : false;
  const canAccept = user.role === 'vendor' && isVendorVerified && task.status === 'open' && !isEmployer;
  const canStart = isAssignedVendor && task.status === 'assigned';
  const canRequestCompletion = isAssignedVendor && ['assigned', 'in-progress'].includes(task.status);
  const canApproveCompletion = isEmployer && task.status === 'completion-requested';
  const canRaiseDispute = isEmployer && !!task.assignedVendor && task.status !== 'disputed';
  const canPay = isEmployer && task.status === 'completed' && task.paymentStatus !== 'paid';
  const hasUserRated = task.ratings?.some(r => {
    const ratedById = typeof r.ratedBy === 'object' ? r.ratedBy._id : r.ratedBy;
    return ratedById === user._id;
  });
  const canRateVendor = isEmployer && task.status === 'completed' && !hasUserRated;
  const canRateEmployer = isAssignedVendor && task.status === 'completed' && !hasUserRated;
  const canEditBudget = isEmployer && task.status === 'open' && !task.assignedVendor;

  const coords = task.location?.coordinates as [number, number] | undefined;
  const mapSrc = coords
    ? (() => {
        const [lng, lat] = coords;
        const delta = 0.01;
        const bbox = `${lng - delta}%2C${lat - delta}%2C${lng + delta}%2C${lat + delta}`;
        return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;
      })()
    : null;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header Status Bar */}
      <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
        <div className="bg-blue-600 px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-white capitalize">
            {task.status.replace('-', ' ')}
          </h1>
          <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm border border-blue-400">
            {task.category}
          </span>
        </div>

        <div className="p-6">
          <div className="flex flex-col md:flex-row justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{task.title}</h2>
              <div className="flex items-center text-gray-500 mb-4">
                <MapPin className="h-4 w-4 mr-2" />
                {task.location?.address || 'No location provided'}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Budget</p>
              <p className="text-3xl font-bold text-blue-600">KES {task.budget.toLocaleString()}</p>
              {canEditBudget && (
                <div className="mt-3 flex items-center gap-2 justify-end">
                  <input
                    type="number"
                    min={1}
                    value={budgetDraft}
                    onChange={(e) => setBudgetDraft(e.target.value)}
                    className="w-32 border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="New budget"
                  />
                  <button
                    onClick={async () => {
                      const val = Number(budgetDraft);
                      if (!val || val <= 0) {
                        alert('Enter a valid budget');
                        return;
                      }
                      setBudgetSaving(true);
                      try {
                        const updated = await taskService.updateBudget(task._id, val);
                        setTask(updated.task);
                      } catch (err: any) {
                        alert(err?.response?.data?.message || 'Failed to update budget');
                      } finally {
                        setBudgetSaving(false);
                      }
                    }}
                    disabled={budgetSaving}
                    className="px-3 py-1 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {budgetSaving ? 'Saving...' : 'Update'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {task.status === 'completion-requested' && (
            <div className="mb-4 p-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Completion requested</p>
                <p className="text-sm">Client has 1 hour to approve or dispute. Auto-approval will occur if no action.</p>
                {task.completionExpiresAt && (
                  <p className="text-xs mt-1 text-amber-700">Time left: {timeLeft ?? 'calculating...'}</p>
                )}
              </div>
            </div>
          )}

          <div className="prose max-w-none text-gray-600 bg-gray-50 p-4 rounded-md mb-6">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-2">Description</h3>
            <p>{task.description}</p>
          </div>

          {/* Location Map */}
          <div className="grid gap-4 md:grid-cols-2 mb-6">
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-500" />
                Location
              </p>
              <p className="mt-1 text-sm text-gray-600">{task.location?.address || 'No location provided'}</p>
              {coords && (
                <p className="text-xs text-gray-500 mt-1">Lat/Lng: {coords[1]}, {coords[0]}</p>
              )}
            </div>
            <div className="overflow-hidden rounded-lg border border-gray-200 h-56 bg-white shadow-sm">
              {mapSrc ? (
                <iframe
                  title="Task location map"
                  src={mapSrc}
                  className="w-full h-full border-0"
                  loading="lazy"
                />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                  No coordinates available for this task.
                </div>
              )}
            </div>
          </div>

          {/* Action Area */}
          <div className="border-t pt-6 flex flex-wrap gap-4 items-center justify-between">
            
            {/* Participant Info */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm text-gray-600">
                <User className="h-5 w-5 mr-2 text-gray-400" />
                <span>Posted by: {typeof task.employer === 'object' ? task.employer.name : 'Unknown'}</span>
              </div>
              {task.assignedVendor && (
                <div className="flex items-center text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Vendor Assigned
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex space-x-3">
              {/* Chat Button */}
              {isTaskParticipant && task.assignedVendor && (
                <button
                  onClick={handleChat}
                  className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Message
                </button>
              )}

              {/* Vendor Accept Button */}
              {canAccept && (
                <button
                  onClick={handleAcceptTask}
                  disabled={actionLoading}
                  className="flex items-center px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {actionLoading ? 'Processing...' : 'Accept Task'}
                </button>
              )}
              {user.role === 'vendor' && !isVendorVerified && task.status === 'open' && (
                <span className="text-xs text-amber-700 bg-amber-50 px-3 py-1 rounded-md">
                  You must be verified to accept tasks.
                </span>
              )}

              {/* Start Work */}
              {canStart && (
                <button
                  onClick={handleStartTask}
                  disabled={actionLoading}
                  className="flex items-center px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50"
                >
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Start Work
                </button>
              )}

              {/* Vendor request completion */}
              {canRequestCompletion && (
                <button
                  onClick={handleRequestCompletion}
                  disabled={actionLoading}
                  className="flex items-center px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Request Completion
                </button>
              )}

              {/* Employer approve/dispute */}
              {canApproveCompletion && (
                <>
                  <button
                    onClick={handleCompleteTask}
                    disabled={actionLoading}
                    className="flex items-center px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve & Close
                  </button>
                  <button
                    onClick={() => setShowDisputeModal(true)}
                    disabled={actionLoading}
                    className="flex items-center px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ShieldAlert className="h-4 w-4 mr-2 text-amber-600" />
                    Dispute
                  </button>
                </>
              )}

              {/* Raise dispute (other states) */}
              {!canApproveCompletion && canRaiseDispute && (
                <button
                  onClick={() => setShowDisputeModal(true)}
                  disabled={actionLoading}
                  className="flex items-center px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  <ShieldAlert className="h-4 w-4 mr-2 text-amber-600" />
                  Raise Dispute
                </button>
              )}

              {/* Pay Button */}
              {canPay && (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="flex items-center px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Pay Now
                </button>
              )}

              {/* Record Cash (employer) */}
              {canPay && (
                <button
                  onClick={handleRecordCashPayment}
                  disabled={actionLoading}
                  className="flex items-center px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  <HandCoins className="h-4 w-4 mr-2 text-amber-600" />
                  Record Cash
                </button>
              )}

              {/* Rate Vendor */}
              {canRateVendor && (
                <button
                  onClick={() => { setRatingTarget('vendor'); setShowRatingModal(true); }}
                  className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
                >
                  Rate Vendor
                </button>
              )}

              {/* Rate Employer */}
              {canRateEmployer && (
                <button
                  onClick={() => { setRatingTarget('employer'); setShowRatingModal(true); }}
                  className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
                >
                  Rate Employer
                </button>
              )}

              {/* Status Indicators */}
              {task.paymentStatus === 'paid' && (
                <span className="flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-md text-sm font-medium">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Paid
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Warning/Info Alerts */}
      {!isTaskParticipant && user.role === 'vendor' && task.status !== 'open' && (
         <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
           <div className="flex">
             <AlertTriangle className="h-5 w-5 text-yellow-400" />
             <p className="ml-3 text-sm text-yellow-700">
               This task has already been assigned to another vendor.
             </p>
           </div>
         </div>
      )}

      {/* Payment Modal */}
      {showDisputeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="flex justify-between items-center px-4 py-3 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Raise a dispute</h3>
              <button onClick={() => setShowDisputeModal(false)} className="text-gray-500 hover:text-gray-700 text-sm">Close</button>
            </div>
            <form onSubmit={handleCreateDispute} className="p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  required
                  type="text"
                  value={disputeForm.title}
                  onChange={(e) => setDisputeForm({ ...disputeForm, title: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Short summary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={disputeForm.type}
                  onChange={(e) => setDisputeForm({ ...disputeForm, type: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="service_not_provided">Service not provided</option>
                  <option value="poor_service_quality">Poor service quality</option>
                  <option value="payment_issue">Payment issue</option>
                  <option value="vendor_no_show">Vendor no show</option>
                  <option value="employer_cancellation">Employer cancellation</option>
                  <option value="safety_concern">Safety concern</option>
                  <option value="harassment">Harassment</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  required
                  rows={4}
                  value={disputeForm.description}
                  onChange={(e) => setDisputeForm({ ...disputeForm, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe what happened"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Evidence links (optional)</label>
                <input
                  type="text"
                  value={disputeForm.evidence}
                  onChange={(e) => setDisputeForm({ ...disputeForm, evidence: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Comma-separated URLs (images, docs, etc.)"
                />
                <p className="text-xs text-gray-500 mt-1">We’ll attach these links to the dispute for admin review.</p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDisputeModal(false)}
                  className="px-4 py-2 text-sm rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {actionLoading ? 'Submitting...' : 'Submit dispute'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <PaymentModal 
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        taskId={task._id}
        amount={task.budget}
        onSuccess={() => {
          fetchTask(); // Refresh to show "Paid" status
        }}
      />

      {/* Rating Modal */}
      <RatingModal
        isOpen={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        onSubmit={handleSubmitRating}
        targetRole={ratingTarget}
      />
    </div>
  );
};

export default TaskDetails;
