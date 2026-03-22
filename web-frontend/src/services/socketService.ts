import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

class SocketService {
    private socket: Socket | null = null;

    connect() {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Matches middleware/socketAuth.js expectation of auth.token
        this.socket = io( SOCKET_URL, {
            auth: {
                token: token
            },
            transports: ['websocket']
        });

        this.socket.on('connect', () => {
            console.log('Socket connected');
        });

        this.socket.on('disconnect', () => {
            console.log('Socket disconnected');
        });
    }

    disconnect(){
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    // Chat Events
    joinConversation(conversationId: string) {
        this.socket?.emit('join_conversation', conversationId);
    }

    leaveConversation(conversationId: string) {
        this.socket?.emit('leave_conversation', conversationId);
    }

    sendMessage(data: { conversationId: string; senderId: string; content: string; messageType?: string }) {
        this.socket?.emit('send_message', data);
    }

    onReceiveMessage(callback: (message: any) => void) {
    this.socket?.on('receive_message', callback);
  }

  // Typing Indicators
  startTyping(conversationId: string, userId: string) {
    this.socket?.emit('typing_start', { conversationId, userId });
  }

  stopTyping(conversationId: string, userId: string) {
    this.socket?.emit('typing_stop', { conversationId, userId });
  }

  onUserTyping(callback: (data: { userId: string; isTyping: boolean }) => void) {
    this.socket?.on('user_typing', callback);
  }
}

export const socketService = new SocketService();
