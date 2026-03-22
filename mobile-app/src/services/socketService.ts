import { io, Socket } from 'socket.io-client';
import Constants from 'expo-constants';

const apiUrl = (Constants.expoConfig?.extra as any)?.API_URL as string | undefined;
const SOCKET_URL = apiUrl ? apiUrl.replace('/api', '') : 'http://localhost:5000';

class SocketService {
  private socket: Socket | null = null;

  connect(token?: string) {
    if (!token) return;
    if (this.socket) this.disconnect();

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      path: '/socket.io/'
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinConversation(conversationId: string) {
    this.socket?.emit('join_conversation', conversationId);
  }

  leaveConversation(conversationId: string) {
    this.socket?.emit('leave_conversation', conversationId);
  }

  sendMessage(data: { conversationId: string; senderId: string; content: string }) {
    this.socket?.emit('send_message', data);
  }

  onReceiveMessage(callback: (message: any) => void) {
    this.socket?.on('receive_message', callback);
  }

  offReceiveMessage(callback: (message: any) => void) {
    this.socket?.off('receive_message', callback);
  }

  startTyping(conversationId: string, userId: string) {
    this.socket?.emit('typing_start', { conversationId, userId });
  }

  stopTyping(conversationId: string, userId: string) {
    this.socket?.emit('typing_stop', { conversationId, userId });
  }

  onUserTyping(callback: (data: { userId: string; isTyping: boolean }) => void) {
    this.socket?.on('user_typing', callback);
  }

  offUserTyping(callback: (data: { userId: string; isTyping: boolean }) => void) {
    this.socket?.off('user_typing', callback);
  }

  onUserOnline(callback: (data: { userId: string }) => void) {
    this.socket?.on('user_online', callback);
  }

  offUserOnline(callback: (data: { userId: string }) => void) {
    this.socket?.off('user_online', callback);
  }

  onUserOffline(callback: (data: { userId: string }) => void) {
    this.socket?.on('user_offline', callback);
  }

  offUserOffline(callback: (data: { userId: string }) => void) {
    this.socket?.off('user_offline', callback);
  }

  onNotification(callback: (data: any) => void) {
    this.socket?.on('notification', callback);
  }

  offNotification(callback: (data: any) => void) {
    this.socket?.off('notification', callback);
  }
}

export const socketService = new SocketService();
