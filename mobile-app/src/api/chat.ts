import { api } from './client';

export const chatApi = {
  list: async (page = 1, limit = 20) => {
    const res = await api.get('/chat/conversations', { params: { page, limit } });
    return res.data.conversations || res.data;
  },
  getMessages: async (conversationId: string, page = 1, limit = 50) => {
    const res = await api.get(`/chat/conversation/${conversationId}/messages`, { params: { page, limit } });
    return res.data.messages || res.data;
  },
  sendMessage: async (conversationId: string, content: string) => {
    const res = await api.post('/chat/message', { conversationId, content });
    return res.data.messageData || res.data;
  },
  getOrCreateForTask: async (taskId: string) => {
    const res = await api.get(`/chat/conversation/${taskId}`);
    return res.data.conversation || res.data;
  }
};
