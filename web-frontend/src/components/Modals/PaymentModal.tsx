import React, { useState } from 'react';
import { paymentService } from '../../services/paymentService';
import { X, Smartphone, Loader2, CheckCircle } from 'lucide-react';
import { useNotificationStore } from '../../store/useNotificationStore';

interface PaymentModalProps {
  taskId: string;
  amount: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ taskId, amount, isOpen, onClose, onSuccess }) => {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');
  const addToast = useNotificationStore((s) => s.addToast);

  if (!isOpen) return null;

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Connects to POST /api/payments/mpesa/stk-push
      await paymentService.initiateMpesa(taskId, phone);
      setSuccessMsg('STK Push sent! Please check your phone to enter PIN.');
      addToast({ title: 'Payment initiated', description: 'STK push sent to your phone.', type: 'success' });
      
      // Poll for status or wait for callback (simplified here)
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 5000); 
    } catch (err: any) {
      setError(err.response?.data?.message || 'Payment failed initiation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
          <h3 className="text-lg font-medium text-gray-900">Confirm Payment</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {successMsg ? (
            <div className="text-center py-6">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <p className="text-lg font-medium text-gray-900">{successMsg}</p>
            </div>
          ) : (
            <form onSubmit={handlePayment}>
              <div className="text-center mb-6">
                <p className="text-sm text-gray-500">Amount to Pay</p>
                <p className="text-3xl font-bold text-gray-900">KES {amount.toLocaleString()}</p>
              </div>

              {error && (
                <div className="mb-4 bg-red-50 text-red-700 p-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  M-Pesa Phone Number
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Smartphone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    placeholder="2547..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">Format: 2547XXXXXXXX</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Pay with M-Pesa'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
