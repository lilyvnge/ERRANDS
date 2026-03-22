import React from 'react';
import { X, Bell, CheckCircle, AlertTriangle } from 'lucide-react';
import { useNotificationStore } from '../../store/useNotificationStore';

const iconForType = (type?: string) => {
  if (type === 'success') return <CheckCircle className="h-4 w-4 text-emerald-500" />;
  if (type === 'warning') return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  if (type === 'error') return <AlertTriangle className="h-4 w-4 text-red-500" />;
  return <Bell className="h-4 w-4 text-blue-500" />;
};

const ToastStack: React.FC = () => {
  const { toasts, removeToast } = useNotificationStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 w-80">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="bg-white shadow-lg border border-gray-200 rounded-lg p-3 flex items-start gap-3"
        >
          <div className="mt-0.5">{iconForType(toast.type)}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{toast.title}</p>
            {toast.description && (
              <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{toast.description}</p>
            )}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastStack;
