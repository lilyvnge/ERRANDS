import React, { useEffect, useState } from 'react';
import { paymentService } from '../../services/paymentService';
import type { Payment } from '../../types';
import { Wallet, ArrowDownLeft, Loader2, Calendar } from 'lucide-react';

const UserPayments: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0 });

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const data = await paymentService.getMyPayments();
        setPayments(data.payments);

        const total = data.summary?.totalEarnings?.[0]?.total || 0;
        const pending = data.summary?.pendingPayments || 0;
        setStats({ total, pending });
      } catch (error) {
        console.error('Failed to load payments', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, []);

  if (loading) {
    return (
      <div className="p-10 flex justify-center">
        <Loader2 className="animate-spin text-blue-600 h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-600">Track all your M-Pesa, card, and cash payments.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-full bg-blue-50 text-blue-700">
            <Wallet className="h-7 w-7" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Paid</p>
            <p className="text-3xl font-bold text-gray-900">KES {stats.total.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-full bg-amber-50 text-amber-700">
            <ArrowDownLeft className="h-7 w-7" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Pending</p>
            <p className="text-3xl font-bold text-gray-900">{stats.pending}</p>
            <p className="text-xs text-gray-500">Awaiting confirmation</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Payment History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Task</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Method</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500">No payments yet.</td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {new Date((payment as any).createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {typeof payment.task === 'object' ? payment.task.title : 'Task'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 capitalize">
                      {payment.paymentMethod}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        payment.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : payment.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                      KES {payment.amount.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserPayments;
