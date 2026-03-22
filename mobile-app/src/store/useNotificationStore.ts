import { create } from 'zustand';

type NotificationItem = {
  _id: string;
  title?: string;
  message?: string;
  type?: string;
  createdAt?: string;
  isRead?: boolean;
};

type NotificationState = {
  notifications: NotificationItem[];
  lastCount: number;
  setNotifications: (items: NotificationItem[]) => void;
  setLastCount: (count: number) => void;
  addNotification: (item: NotificationItem) => void;
  markAsRead: (id: string) => void;
};

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  lastCount: 0,
  setNotifications: (items) => set({ notifications: items }),
  setLastCount: (count) => set({ lastCount: count }),
  addNotification: (item) => set((state) => ({ notifications: [item, ...state.notifications], lastCount: state.lastCount + 1 })),
  markAsRead: (id: string) => set((state) => ({
    notifications: state.notifications.map(n => n._id === id ? { ...n, isRead: true } : n)
  })),
}));
