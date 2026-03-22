import { create } from 'zustand';

interface ChatState {
  unread: Record<string, number>;
  incrementUnread: (conversationId: string) => void;
  clearUnread: (conversationId: string) => void;
  totalUnread: () => number;
}

export const useChatStore = create<ChatState>((set, get) => ({
  unread: {},
  incrementUnread: (conversationId) =>
    set((state) => ({
      unread: { ...state.unread, [conversationId]: (state.unread[conversationId] || 0) + 1 }
    })),
  clearUnread: (conversationId) =>
    set((state) => {
      const next = { ...state.unread };
      delete next[conversationId];
      return { unread: next };
    }),
  totalUnread: () => {
    const unread = get().unread;
    return Object.values(unread).reduce((sum, val) => sum + val, 0);
  }
}));
